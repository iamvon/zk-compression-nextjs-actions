import { clusterApiUrl } from "@solana/web3.js";
import {
  LightSystemProgram,
  createRpc,
  defaultTestStateTreeAccounts,
  Rpc
} from "@lightprotocol/stateless.js";

import { ComputeBudgetProgram, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection: Rpc = createRpc(clusterApiUrl('mainnet-beta'));

export const buildCompressSolTx = async (payer: string, solAmount: number): Promise<Transaction> => {
  try {
    // Fetch the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Compress lamports to self
    const ix = await LightSystemProgram.compress({
      payer: new PublicKey(payer),
      toAddress: new PublicKey(payer),
      lamports: solAmount*LAMPORTS_PER_SOL,
      outputStateTree: defaultTestStateTreeAccounts().merkleTree,
    });

    // Create a transaction and manually set the fee payer and blockhash
    const transaction = new Transaction();

    // Add the fee payer
    transaction.feePayer = new PublicKey(payer);

    // Add the instructions
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
      ix
    );

    // Set the recent blockhash
    transaction.recentBlockhash = blockhash;

    // Return the unsigned transaction for client-side signing
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error("Transaction creation failed");
  }
};
