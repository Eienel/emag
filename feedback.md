# ShadowPay — feedback on iExec Nox & Confidential Tokens

This is the required `feedback.md` per the Vibe Coding Challenge evaluation
criteria. Honest, builder-perspective notes from shipping ShadowPay end-to-end
on Arbitrum Sepolia in 72 hours.

## The good

1. **The `ERC20ToERC7984Wrapper` is the right abstraction.** Being able to take
   an existing real stablecoin (USDC, EURC, USDe…) and surface it as a
   confidential ERC-7984 with one line — `contract WrappedX is
   ERC20ToERC7984Wrapper { … }` — is exactly the paving-stone DeFi devs need.
   It made our contract code dramatically smaller than if we'd had to roll our
   own confidential token from scratch.
2. **`Nox.mul(euint256, uint256)` is gold for streaming.** The ability to
   multiply an encrypted value by a public scalar made the chunked-streaming
   design tractable. Without it, we would have had to either (a) store one
   encrypted chunk per period (gas-prohibitive), or (b) store the amount in
   plaintext (defeating the whole point). This single primitive is what lets
   ShadowPay exist.
3. **ACL semantics (`allow`, `allowTransient`, `allowThis`) are intuitive.**
   The mental model "this handle can be decrypted by these addresses, plus the
   contract for the duration of this tx" matches exactly how we wanted to
   structure auditor disclosure.
4. **Composability with normal ERC-20 flows is preserved.** We could keep using
   `approve` / `setOperator` semantics our users already know, just with a
   different transfer function under the hood. That's the right level of
   abstraction.
5. **`cdefi-wizard.iex.ec` is genuinely useful for orienting yourself fast.**
   The wizard's generated skeletons gave us a working mental model in minutes.

## Friction we hit

1. **Discovering the SDK surface required spelunking docs.** The welcome page,
   the ERC7984 guide, the wrapper guide, and the Solidity-library reference are
   all in different sub-trees of the docs site, and none of them have a single
   "all methods on ERC-7984 with full signatures" cheat sheet. We had to
   cross-reference Zama's FHEVM docs to fill in confidential-transfer overload
   shapes. A one-page API reference (every public method, every overload, every
   parameter type) at the top of the docs would save every team a few hours.
2. **Two-step async unwrap is conceptually right but the demo-time
   onboarding is rough.** New users hit "unwrap" expecting it to be one tx and
   get confused by the request → finalize flow. We ended up not exposing
   unwrap in the v1 UI at all because we couldn't make it feel native in the
   time we had. A reusable `<UnwrapButton/>` React component (or even a
   documented pattern in the SDK README) would unblock this for everyone.
3. **Local FHE testing story is unclear.** The FHEVM Hardhat plugin exists
   upstream, but the iExec Nox docs don't have a "how to write tests against
   encrypted state locally" page. We ended up writing only control-plane tests
   and validating FHE behaviour against the live testnet, which slowed our
   iteration loop.
4. **Arbitrum Sepolia USDC address isn't documented in the iExec docs.** We
   had to track it down independently and ship our deploy script with both a
   "known testnet USDC" path and a "deploy a MockERC20" fallback. A short
   "official testnet token addresses" section in the docs would prevent that.
5. **The `@iexec-nox/*` npm packages currently 403 from anonymous browser
   fetches.** That's fine for npm itself, but it makes the GitHub README the
   only source of truth for the package's actual exports. Publishing a
   browseable copy of the README at `docs.iex.ec/sdk-reference` would help.
6. **No first-class TypeScript types for FHE handles in the frontend SDK.** A
   handle is `bytes32` on chain but appears variously as `string`,
   `Uint8Array`, or `0x${string}` across SDK methods. We added our own
   normalisation in `web/lib/nox.ts`. A `type Handle = \`0x\${string}\`` exported
   from `@iexec-nox/handle` would be a cheap quality-of-life fix.

## Things we wish existed

1. **Encrypted aggregate views.** It would be enormously useful for treasury
   dashboards to read an encrypted SUM of all streams created by a given payer
   without per-stream decryption. Some of this is achievable today by
   accumulating into an `euint256` total at write-time; documenting that
   pattern (and giving us `Nox.add` examples) would unlock CFO-style views.
2. **`onConfidentialTransferReceived` examples beyond the spec.** A worked
   example of a contract that reacts to confidential inflows (e.g. our payroll
   contract receiving deposits from an arbitrary employer) would be helpful.
   We worked around it via the operator pattern, but it adds steps.
3. **A reference React provider (`<NoxProvider/>`).** Bundling the SDK,
   chain-config, and gateway connection into one provider component would let
   teams skip 30 lines of boilerplate. We essentially built one in
   `web/lib/nox.ts` — it should ship with the SDK.

## Verdict

We shipped a real, end-to-end working application — onchain encrypted stream
state, FHE-decrypted views, selective auditor disclosure — in 72 hours, with no
prior iExec experience. That's the bar a hackathon platform should clear, and
Nox cleared it. The friction items above are all polish, not architecture; the
core primitives are solid and the design choices are right.

We would build on Nox again. We'd love to see (a) a single-page API reference,
(b) a documented local FHE testing story, and (c) a reference React provider —
those three would meaningfully accelerate the next batch of builders.
