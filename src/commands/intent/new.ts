import chalk from 'chalk'
import { Command } from '@oclif/command'
import { ethers } from 'ethers'
import {
  promptTokens,
  handleTransaction,
  handleError,
  getWallet,
  getMetadata,
  displayDescription,
  confirmTransaction,
} from '../../lib/utils'

const constants = require('../../lib/constants.json')
const Indexer = require('@airswap/indexer/build/contracts/Indexer.json')
const indexerDeploys = require('@airswap/indexer/deploys.json')

export default class IntentNew extends Command {
  static description = 'create an index for a new token pair'
  async run() {
    const wallet = await getWallet(this)
    const chainId = (await wallet.provider.getNetwork()).chainId
    const metadata = await getMetadata(this, chainId)
    displayDescription(this, IntentNew.description, chainId)

    const indexerAddress = indexerDeploys[chainId]
    const indexerContract = new ethers.Contract(indexerAddress, Indexer.abi, wallet)
    this.log(chalk.white(`Indexer ${indexerAddress}\n`))

    const { first, second } = await promptTokens(metadata)

    this.log()

    indexerContract.indexes(first.addr, second.addr, constants.protocols.HTTP_LATEST).then(async (index: any) => {
      if (index !== constants.ADDRESS_ZERO) {
        this.log(`${chalk.yellow('Pair already exists')}`)
        this.log(`Set intent on this pair with ${chalk.bold('intent:set')}\n`)
      } else {
        confirmTransaction(
          this,
          metadata,
          'createIndex',
          {
            signerToken: `${first.addr} (${first.name})`,
            senderToken: `${second.addr} (${second.name})`,
          },
          () => {
            indexerContract
              .createIndex(first.addr, second.addr, constants.protocols.HTTP_LATEST)
              .then(handleTransaction)
              .catch(handleError)
          },
        )
      }
    })
  }
}
