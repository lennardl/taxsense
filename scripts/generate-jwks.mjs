// One-off key generation for the Singpass/Myinfo app registration.
// Usage: node scripts/generate-jwks.mjs
//
// Writes:
//   public/.well-known/jwks.json   — public keys only; committed; served with
//                                    every static deploy at /.well-known/jwks.json
//   secrets/singpass-sig-private.jwk.json  — gitignored; goes into the
//   secrets/singpass-enc-private.jwk.json    SINGPASS_*_PRIVATE_JWK env vars
//
// Re-running OVERWRITES the keys. The registered app validates against the old
// JWKS, so regenerate only if keys are lost or compromised, then update the
// registration.
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

function makeKey(use, alg) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const kid = `taxsense-${use}-${randomUUID().slice(0, 8)}`;
  const pub = { ...publicKey.export({ format: 'jwk' }), use, alg, kid };
  const priv = { ...privateKey.export({ format: 'jwk' }), use, alg, kid };
  return { pub, priv };
}

// Signature key: signs the private_key_jwt client assertion. ES256 per current
// Singpass specs — VERIFY at integration time (SINGPASS-PLAN.md §1.7).
const sig = makeKey('sig', 'ES256');

// Encryption key: Myinfo encrypts the person payload to this key (JWE).
// EC P-256 with ECDH-ES key agreement; VERIFY the exact required `alg` label
// against the current API spec — adjusting it is a one-line JWKS edit, the key
// material itself is standard.
const enc = makeKey('enc', 'ECDH-ES+A256KW');

mkdirSync('public/.well-known', { recursive: true });
mkdirSync('secrets', { recursive: true });

writeFileSync(
  'public/.well-known/jwks.json',
  `${JSON.stringify({ keys: [sig.pub, enc.pub] }, null, 2)}\n`,
);
writeFileSync(
  'secrets/singpass-sig-private.jwk.json',
  `${JSON.stringify(sig.priv, null, 2)}\n`,
);
writeFileSync(
  'secrets/singpass-enc-private.jwk.json',
  `${JSON.stringify(enc.priv, null, 2)}\n`,
);

console.log('kids:', sig.pub.kid, enc.pub.kid);
console.log('public JWKS  -> public/.well-known/jwks.json (commit this)');
console.log('private keys -> secrets/ (gitignored — NEVER commit)');
