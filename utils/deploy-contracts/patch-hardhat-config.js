#!/usr/bin/env node

/**
 * Patches hardhat.config.ts to handle chains not in the safe-singleton-factory package.
 * When the chain is unknown to the package but the Safe Singleton Factory is already
 * deployed at 0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7, we point hardhat-deploy
 * at it directly with zero funding (nothing to deploy).
 */

const fs = require('fs');
const path = require('path');

const FACTORY = '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7';

const configPath = path.join(process.cwd(), 'hardhat.config.ts');
let content = fs.readFileSync(configPath, 'utf8');

if (content.includes('// Patched for custom networks')) {
  process.exit(0);
}

if (!content.includes('const deterministicDeployment = (network: string)')) {
  console.error('Could not find deterministicDeployment function in hardhat.config.ts');
  process.exit(1);
}

const patchedFunction =
  '// Patched for custom networks\n' +
  'const deterministicDeployment = (network: string): DeterministicDeploymentInfo | undefined => {\n' +
  '    const info = getSingletonFactoryInfo(parseInt(network))\n' +
  '    if (info) {\n' +
  '        return {\n' +
  '            factory: info.address,\n' +
  '            deployer: info.signerAddress,\n' +
  '            funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),\n' +
  '            signedTx: info.transaction,\n' +
  '        }\n' +
  '    }\n' +
  '    // Chain not in safe-singleton-factory package.\n' +
  '    // The Safe team pre-deploys the factory at this address — use it with zero funding.\n' +
  '    return {\n' +
  '        factory: "' + FACTORY + '",\n' +
  '        deployer: "' + FACTORY + '",\n' +
  '        funding: "0",\n' +
  '        signedTx: "0x",\n' +
  '    }\n' +
  '};';

content = content.replace(
  /const deterministicDeployment = \(network: string\): DeterministicDeploymentInfo => \{[\s\S]*?\n\};/,
  patchedFunction
);


fs.writeFileSync(configPath, content);
