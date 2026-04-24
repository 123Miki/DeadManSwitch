# Dead Man Switch

A trustless, non-upgradable Ethereum smart contract for automatic crypto inheritance.

If the owner stops interacting with the contract for a defined period of inactivity, the designated heir can claim all funds.

**Mainnet contract:** [`0xE5f9db89cb22D8BFf52c6efBbAc05f7d69C7ca12`](https://etherscan.io/address/0xE5f9db89cb22D8BFf52c6efBbAc05f7d69C7ca12)

---

## How it works

1. **Deploy your switch** — call `createSwitch()` on the factory with your heir address and an inactivity delay (30 days to 3 years)
2. **Deposit funds** — send ETH to your switch contract via `deposit()`
3. **Stay alive** — call `ping()` regularly to reset the inactivity timer
4. **If you disappear** — after the delay expires, your heir can call `claim()` and receive all funds

No admin, no upgrade key, no backdoor. Once deployed, the contract is immutable.

---

## Fees

| Action | Fee |
|--------|-----|
| Deposit | 0.1% of deposited amount |
| Change heir | 0.001 ETH flat fee |

---

## Use on Etherscan (no frontend needed)

### 1. Create your switch

Go to the [Factory contract on Etherscan](https://etherscan.io/address/0xE5f9db89cb22D8BFf52c6efBbAc05f7d69C7ca12#writeContract) → **Write Contract** → connect your wallet → `createSwitch`:

- `_heir`: your heir's wallet address
- `_delay`: inactivity delay in seconds (e.g. `2592000` = 30 days, `31536000` = 1 year)

After the transaction, go to **Read Contract** → `switches` → enter your address → copy the deployed switch address.

### 2. Deposit ETH

Go to your switch contract on Etherscan → **Write Contract** → `deposit`:

- Set the ETH value to send (e.g. `1` ETH)
- 0.1% fee is deducted automatically

### 3. Ping (prove you're alive)

Go to your switch contract → **Write Contract** → `ping`

Call this before your inactivity delay expires to reset the timer. No ETH required.

### 4. Change your heir

Go to your switch contract → **Write Contract** → `setHeir`:

- `_newHeir`: new heir address
- Send `0.001` ETH with the transaction (fee)

### 5. Change the inactivity delay

Go to your switch contract → **Write Contract** → `setDelay`:

- `_newDelay`: new delay in seconds

Minimum: `2592000` (30 days) — Maximum: `94608000` (3 years)

### 6. Claim (heir only)

Once the inactivity delay has expired, go to the switch contract → **Write Contract** → `claim`

All ETH in the contract is transferred to the heir.

---

## Read contract state

| Field | Description |
|-------|-------------|
| `owner` | Owner address |
| `heir` | Current heir address |
| `lastPing` | Timestamp of last activity |
| `inactivityDelay` | Delay in seconds before heir can claim |

To check if the switch is claimable: `block.timestamp > lastPing + inactivityDelay`

---

## Security

- No owner privileges after deployment — the owner cannot withdraw funds directly
- Non-upgradable — no proxy, no admin key
- Reentrancy-safe — follows Checks-Effects-Interactions pattern
- Anyone can deposit, only the owner can ping or change settings, only the heir can claim
- 53 tests passing

## Development

```bash
cd backend
npm install
npx hardhat test
```
