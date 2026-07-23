// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title Bolita
 * @notice Loteria de terminales al estilo de la bolita cubana, sobre USDT.
 *
 * ============ COMO SE JUEGA ============
 *
 * Sale un numero del 00 al 99. Se apuesta al TERMINAL, es decir al ultimo
 * digito. Jugar el terminal 4 es jugar el 04, 14, 24, 34, 44, 54, 64, 74, 84
 * y 94: diez numeros de cien.
 *
 *     Probabilidad de acertar un terminal .... 10%
 *     Pago .................................. 8 veces lo apostado
 *     Margen de la banca .................... 20%
 *
 * Un numero suelto seria 1% de probabilidad y tendria que pagar 80x. Con eso,
 * un solo acierto se lleva 80 veces la apuesta y revienta una banca pequeña.
 * El terminal tiene EL MISMO MARGEN con diez veces menos riesgo por jugada.
 * Por eso este contrato paga terminales y no numeros sueltos.
 *
 * ============ POR QUE LA BANCA NO PUEDE QUEBRAR ============
 *
 * Esto no es "poco probable". Es imposible por construccion.
 *
 * El contrato RECHAZA cualquier apuesta que no pueda pagar. Antes de aceptar
 * dinero calcula: "si sale este terminal, cuanto debo?". Si esa cifra supera
 * el limite, la apuesta se revierte.
 *
 *     limitePorTerminal = banca * maxExposureBps / 10000
 *     apuestaMaxPorTerminal = limitePorTerminal / multiplicador
 *
 * Con banca de 100 USDT, exposicion 20% y pago 8x:
 *
 *     limite por terminal ......... 20 USDT
 *     apostado maximo por terminal . 2.50 USDT
 *     si se llenan los 10 ......... entran 25, se pagan 20, se ganan 5
 *
 * Solo puede salir UN terminal, asi que la deuda maxima de la ronda es la de
 * ese unico terminal. Limitando cada uno por separado queda cubierto el peor
 * caso posible.
 *
 * Cuando un terminal se llena, se cierra y hay que jugar otro. Eso equilibra
 * la banca sola, sin que nadie intervenga.
 *
 * Los limites se recalculan sobre el saldo real: si la banca crece, suben
 * solos. No hay que tocar nada.
 *
 * ============ ALEATORIEDAD ============
 *
 * Una sola fuente buena: Chainlink VRF. Mezclar varias fuentes caseras no da
 * mas seguridad, da mas superficie de fallo. Ni el dueño puede predecir ni
 * alterar el resultado, y queda la prueba on-chain para quien quiera mirarla.
 *
 * ============ ADMINISTRACION ============
 *
 * No hay panel web. Las funciones onlyOwner se llaman desde la wallet del
 * dueño en BscScan o Remix. Si no existe pagina de administracion, no hay
 * nada que hackear.
 */
contract Bolita is VRFConsumerBaseV2Plus, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =====================================================================
    // Constantes
    // =====================================================================

    uint256 public constant DENOMINATOR = 10000;
    uint8   public constant TERMINALS = 10;

    /// @notice Tope duro de exposicion por terminal: 30% de la banca.
    ///         Ni el dueño puede subirlo mas. Es lo que garantiza que una
    ///         mala racha no se lleve el respaldo entero.
    uint256 public constant MAX_EXPOSURE_BPS = 3000;

    /// @notice Pago maximo configurable. Por encima de esto el margen se
    ///         volveria negativo y la banca perderia a largo plazo.
    uint256 public constant MAX_PAYOUT_X100 = 950; // 9.50x

    // =====================================================================
    // Tipos
    // =====================================================================

    enum RoundState { Open, Drawing, Settled, Refunded }

    struct Round {
        uint256 id;
        uint256 openedAt;
        uint256 closesAt;
        RoundState state;
        uint256 bankrollSnapshot;   // banca al abrir: base de los limites
        uint256 maxLiability;       // deuda maxima permitida por terminal
        uint256 payoutX100;         // multiplicador congelado de esta ronda
        uint256 totalStaked;
        uint8   winningNumber;      // 00-99
        uint8   winningTerminal;    // 0-9
        uint256 requestId;
        uint256 drawnAt;
    }

    // =====================================================================
    // Estado
    // =====================================================================

    IERC20 public immutable token;      // USDT en BSC
    uint8  public immutable tokenDecimals;

    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;

    /// @notice Apostado por ronda y terminal.
    mapping(uint256 => mapping(uint8 => uint256)) public terminalStake;

    /// @notice Apostado por ronda, usuario y terminal.
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userStake;

    /// @notice Apostado por ronda y usuario, para el tope por persona.
    mapping(uint256 => mapping(address => uint256)) public userTotalStake;

    /// @notice Premios ya asignados y no retirados.
    mapping(address => uint256) public winnings;

    /// @notice Terminales que un usuario jugo en una ronda, para poder cobrar.
    mapping(uint256 => mapping(address => uint8[])) public userTerminals;
    mapping(uint256 => mapping(address => bool)) public claimed;

    mapping(uint256 => uint256) public requestToRound;

    // --- Contabilidad de la banca ---

    /// @notice Capital de respaldo + beneficios acumulados.
    uint256 public bankroll;

    /// @notice Total pendiente de pagar a ganadores. Intocable para el dueño.
    uint256 public pendingPayouts;

    /// @notice Apostado en la ronda abierta. Aun no es de nadie.
    uint256 public escrowed;

    // --- Configuracion ---

    uint256 public payoutX100 = 800;      // 8.00x
    uint256 public maxExposureBps = 2000; // 20% de la banca por terminal
    uint256 public minBet;
    uint256 public maxBetPerUser;         // tope por persona y ronda
    uint256 public roundDuration = 1 days;
    uint256 public drawTimeout = 2 hours; // si el VRF no responde, se devuelve

    // --- VRF ---

    uint256 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32  public vrfCallbackGasLimit = 200000;
    uint16  public vrfConfirmations = 3;

    // =====================================================================
    // Eventos
    // =====================================================================

    event RoundOpened(uint256 indexed id, uint256 closesAt, uint256 bankroll, uint256 maxLiability);
    event BetPlaced(address indexed user, uint256 indexed roundId, uint8 terminal, uint256 amount);
    event TerminalFull(uint256 indexed roundId, uint8 terminal);
    event DrawRequested(uint256 indexed roundId, uint256 requestId);
    event RoundSettled(uint256 indexed roundId, uint8 winningNumber, uint8 winningTerminal, uint256 totalPayout);
    event RoundRefunded(uint256 indexed roundId, string reason);
    event Claimed(address indexed user, uint256 amount);
    event BankrollDeposited(uint256 amount, uint256 newBankroll);
    event BankrollWithdrawn(uint256 amount, uint256 newBankroll);
    event ConfigChanged(string what);

    // =====================================================================
    // Errores
    // =====================================================================

    error RoundNotOpen();
    error RoundStillOpen();
    error BettingClosed();
    error BetTooSmall(uint256 sent, uint256 min);
    error UserLimitExceeded(uint256 wouldBe, uint256 limit);
    error TerminalFullError(uint8 terminal, uint256 available);
    error InvalidTerminal(uint8 terminal);
    error NothingToClaim();
    error AlreadyClaimed();
    error RoundNotSettled();
    error InsufficientFreeBankroll(uint256 requested, uint256 available);
    error PayoutTooHigh(uint256 requested, uint256 maximum);
    error ExposureTooHigh(uint256 requested, uint256 maximum);
    error ZeroAmount();
    error DrawNotTimedOut();
    error BankrollTooLow();

    // =====================================================================
    // Constructor
    // =====================================================================

    constructor(
        address _token,
        uint8   _tokenDecimals,
        address _vrfCoordinator,
        uint256 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        uint256 _minBet,
        uint256 _maxBetPerUser
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        token = IERC20(_token);
        tokenDecimals = _tokenDecimals;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
        minBet = _minBet;
        maxBetPerUser = _maxBetPerUser;
    }

    // =====================================================================
    // Banca
    // =====================================================================

    /// @notice Aporta capital de respaldo. Requiere approve previo del token.
    function depositBankroll(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        bankroll += amount;
        emit BankrollDeposited(amount, bankroll);
    }

    /**
     * @notice Retira capital o beneficios.
     * @dev No puede tocar lo que se debe a ganadores ni lo apostado en la
     *      ronda abierta. Si hay una ronda en juego, tampoco puede retirar la
     *      garantia que la cubre.
     */
    function withdrawBankroll(uint256 amount) external onlyOwner nonReentrant {
        uint256 free = freeBankroll();
        if (amount > free) revert InsufficientFreeBankroll(amount, free);

        bankroll -= amount;
        token.safeTransfer(msg.sender, amount);
        emit BankrollWithdrawn(amount, bankroll);
    }

    /**
     * @notice Capital que el dueño puede sacar ahora mismo.
     *         Excluye la garantia reservada para la ronda en curso.
     */
    function freeBankroll() public view returns (uint256) {
        Round storage r = rounds[currentRoundId];

        uint256 reserved;
        if (r.state == RoundState.Open || r.state == RoundState.Drawing) {
            // Se reserva la deuda maxima posible de la ronda viva
            reserved = r.maxLiability;
        }

        if (bankroll <= reserved) return 0;
        return bankroll - reserved;
    }

    /// @notice Deuda maxima permitida por terminal en la ronda abierta.
    function currentMaxLiability() public view returns (uint256) {
        return (bankroll * maxExposureBps) / DENOMINATOR;
    }

    /// @notice Cuanto se puede apostar todavia a un terminal concreto.
    function availableOnTerminal(uint8 terminal) public view returns (uint256) {
        if (terminal >= TERMINALS) revert InvalidTerminal(terminal);

        Round storage r = rounds[currentRoundId];
        if (r.state != RoundState.Open) return 0;

        uint256 maxStake = (r.maxLiability * 100) / r.payoutX100;
        uint256 used = terminalStake[currentRoundId][terminal];

        return used >= maxStake ? 0 : maxStake - used;
    }

    // =====================================================================
    // Rondas
    // =====================================================================

    /**
     * @notice Abre una ronda. Congela la banca y el multiplicador, para que
     *         cambiarlos a mitad de partida no afecte a quien ya aposto.
     */
    function openRound() external whenNotPaused {
        Round storage prev = rounds[currentRoundId];
        if (currentRoundId != 0 &&
            prev.state != RoundState.Settled &&
            prev.state != RoundState.Refunded) revert RoundStillOpen();

        if (bankroll == 0) revert BankrollTooLow();

        currentRoundId += 1;
        uint256 id = currentRoundId;

        Round storage r = rounds[id];
        r.id = id;
        r.openedAt = block.timestamp;
        r.closesAt = block.timestamp + roundDuration;
        r.state = RoundState.Open;
        r.bankrollSnapshot = bankroll;
        r.maxLiability = currentMaxLiability();
        r.payoutX100 = payoutX100;

        emit RoundOpened(id, r.closesAt, bankroll, r.maxLiability);
    }

    /**
     * @notice Apuesta a un terminal (0-9).
     * @dev Requiere approve previo. El contrato rechaza la apuesta si no
     *      pudiera pagarla en caso de que ese terminal salga premiado.
     */
    function bet(uint8 terminal, uint256 amount) external whenNotPaused nonReentrant {
        if (terminal >= TERMINALS) revert InvalidTerminal(terminal);
        if (amount < minBet) revert BetTooSmall(amount, minBet);

        uint256 id = currentRoundId;
        Round storage r = rounds[id];

        if (r.state != RoundState.Open) revert RoundNotOpen();
        if (block.timestamp >= r.closesAt) revert BettingClosed();

        // Tope por persona
        uint256 userWouldBe = userTotalStake[id][msg.sender] + amount;
        if (maxBetPerUser > 0 && userWouldBe > maxBetPerUser) {
            revert UserLimitExceeded(userWouldBe, maxBetPerUser);
        }

        // --- LA COMPROBACION QUE HACE IMPOSIBLE LA QUIEBRA ---
        // Si este terminal saliera premiado, cuanto habria que pagar?
        uint256 newTerminalStake = terminalStake[id][terminal] + amount;
        uint256 liabilityIfWins = (newTerminalStake * r.payoutX100) / 100;

        if (liabilityIfWins > r.maxLiability) {
            uint256 maxStake = (r.maxLiability * 100) / r.payoutX100;
            uint256 used = terminalStake[id][terminal];
            revert TerminalFullError(terminal, used >= maxStake ? 0 : maxStake - used);
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        if (userStake[id][msg.sender][terminal] == 0) {
            userTerminals[id][msg.sender].push(terminal);
        }

        terminalStake[id][terminal] = newTerminalStake;
        userStake[id][msg.sender][terminal] += amount;
        userTotalStake[id][msg.sender] = userWouldBe;
        r.totalStaked += amount;
        escrowed += amount;

        emit BetPlaced(msg.sender, id, terminal, amount);

        if (liabilityIfWins == r.maxLiability) {
            emit TerminalFull(id, terminal);
        }
    }

    /// @notice Cierra las apuestas y pide el numero a Chainlink. Cualquiera puede llamarla.
    function closeAndDraw() external whenNotPaused {
        uint256 id = currentRoundId;
        Round storage r = rounds[id];

        if (r.state != RoundState.Open) revert RoundNotOpen();
        if (block.timestamp < r.closesAt) revert RoundStillOpen();

        // Sin apuestas no hay nada que sortear
        if (r.totalStaked == 0) {
            r.state = RoundState.Refunded;
            emit RoundRefunded(id, "sin apuestas");
            return;
        }

        r.state = RoundState.Drawing;
        r.drawnAt = block.timestamp;

        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubscriptionId,
                requestConfirmations: vrfConfirmations,
                callbackGasLimit: vrfCallbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        r.requestId = requestId;
        requestToRound[requestId] = id;
        emit DrawRequested(id, requestId);
    }

    /// @dev Lo llama Chainlink. Aqui se decide el numero y se reparte.
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords)
        internal
        override
    {
        uint256 id = requestToRound[requestId];
        Round storage r = rounds[id];
        if (r.state != RoundState.Drawing) return;

        uint8 number = uint8(randomWords[0] % 100);
        uint8 terminal = number % 10;

        r.winningNumber = number;
        r.winningTerminal = terminal;
        r.state = RoundState.Settled;

        uint256 winnersStake = terminalStake[id][terminal];
        uint256 payout = (winnersStake * r.payoutX100) / 100;

        // El dinero apostado deja de estar en deposito
        escrowed -= r.totalStaked;
        pendingPayouts += payout;

        // Ajuste de la banca: entra todo lo apostado, sale lo que se paga
        if (r.totalStaked >= payout) {
            bankroll += r.totalStaked - payout;
        } else {
            bankroll -= (payout - r.totalStaked);
        }

        emit RoundSettled(id, number, terminal, payout);
    }

    /**
     * @notice Si Chainlink no respondiera, permite anular y devolver.
     *         Es la red de seguridad para que el dinero nunca quede atrapado.
     */
    function refundStuckRound() external nonReentrant {
        uint256 id = currentRoundId;
        Round storage r = rounds[id];

        if (r.state != RoundState.Drawing) revert RoundNotOpen();
        if (block.timestamp < r.drawnAt + drawTimeout) revert DrawNotTimedOut();

        r.state = RoundState.Refunded;
        emit RoundRefunded(id, "el sorteo no respondio");
    }

    // =====================================================================
    // Cobrar
    // =====================================================================

    /// @notice Cobra lo ganado (o recupera lo apostado si la ronda se anulo).
    function claim(uint256 roundId) external nonReentrant {
        Round storage r = rounds[roundId];
        if (r.state != RoundState.Settled && r.state != RoundState.Refunded) {
            revert RoundNotSettled();
        }
        if (claimed[roundId][msg.sender]) revert AlreadyClaimed();

        uint256 amount;

        if (r.state == RoundState.Refunded) {
            amount = userTotalStake[roundId][msg.sender];
            if (amount > 0) escrowed -= amount;
        } else {
            uint256 staked = userStake[roundId][msg.sender][r.winningTerminal];
            if (staked > 0) {
                amount = (staked * r.payoutX100) / 100;
                pendingPayouts -= amount;
            }
        }

        if (amount == 0) revert NothingToClaim();

        claimed[roundId][msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Cuanto puede cobrar un usuario de una ronda.
    function claimable(uint256 roundId, address user) external view returns (uint256) {
        Round storage r = rounds[roundId];
        if (claimed[roundId][user]) return 0;

        if (r.state == RoundState.Refunded) return userTotalStake[roundId][user];
        if (r.state != RoundState.Settled) return 0;

        uint256 staked = userStake[roundId][user][r.winningTerminal];
        return (staked * r.payoutX100) / 100;
    }

    // =====================================================================
    // Consultas para la web
    // =====================================================================

    /// @notice Estado completo de la ronda actual, en una sola llamada.
    function roundSnapshot()
        external
        view
        returns (
            uint256 id,
            uint8 state,
            uint256 closesAt,
            uint256 totalStaked,
            uint256 maxLiability,
            uint256 payoutX100_,
            uint256[10] memory staked,
            uint256[10] memory available,
            uint8 winningNumber,
            uint8 winningTerminal
        )
    {
        uint256 rid = currentRoundId;
        Round storage r = rounds[rid];

        uint256 maxStake = r.payoutX100 > 0 ? (r.maxLiability * 100) / r.payoutX100 : 0;

        for (uint8 t = 0; t < TERMINALS; t++) {
            uint256 used = terminalStake[rid][t];
            staked[t] = used;
            if (r.state == RoundState.Open && maxStake > used) {
                available[t] = maxStake - used;
            }
        }

        return (
            rid,
            uint8(r.state),
            r.closesAt,
            r.totalStaked,
            r.maxLiability,
            r.payoutX100,
            staked,
            available,
            r.winningNumber,
            r.winningTerminal
        );
    }

    function userSnapshot(uint256 roundId, address user)
        external
        view
        returns (uint256 total, uint256[10] memory perTerminal, bool hasClaimed)
    {
        for (uint8 t = 0; t < TERMINALS; t++) {
            perTerminal[t] = userStake[roundId][user][t];
        }
        return (userTotalStake[roundId][user], perTerminal, claimed[roundId][user]);
    }

    // =====================================================================
    // Administracion — sin panel web, solo desde la wallet del dueño
    // =====================================================================

    function setPayout(uint256 _payoutX100) external onlyOwner {
        if (_payoutX100 > MAX_PAYOUT_X100) revert PayoutTooHigh(_payoutX100, MAX_PAYOUT_X100);
        payoutX100 = _payoutX100;
        emit ConfigChanged("payout");
    }

    function setExposure(uint256 _bps) external onlyOwner {
        if (_bps > MAX_EXPOSURE_BPS) revert ExposureTooHigh(_bps, MAX_EXPOSURE_BPS);
        maxExposureBps = _bps;
        emit ConfigChanged("exposure");
    }

    function setBetLimits(uint256 _minBet, uint256 _maxBetPerUser) external onlyOwner {
        minBet = _minBet;
        maxBetPerUser = _maxBetPerUser;
        emit ConfigChanged("betLimits");
    }

    function setRoundDuration(uint256 _seconds) external onlyOwner {
        roundDuration = _seconds;
        emit ConfigChanged("roundDuration");
    }

    function setVrfConfig(
        uint256 _subId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _confirmations
    ) external onlyOwner {
        vrfSubscriptionId = _subId;
        vrfKeyHash = _keyHash;
        vrfCallbackGasLimit = _callbackGasLimit;
        vrfConfirmations = _confirmations;
        emit ConfigChanged("vrf");
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Rescata tokens que no sean el de juego, enviados por error.
     * @dev No puede tocar el token del juego: eso protege el dinero de los
     *      jugadores incluso frente al dueño.
     */
    function rescueOtherToken(address other, uint256 amount) external onlyOwner {
        require(other != address(token), "No se puede tocar el token del juego");
        IERC20(other).safeTransfer(msg.sender, amount);
    }
}
