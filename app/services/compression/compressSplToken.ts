import { clusterApiUrl, TransactionInstruction } from "@solana/web3.js";
import {
    LightSystemProgram,
    createRpc,
    defaultTestStateTreeAccounts,
    Rpc
} from "@lightprotocol/stateless.js";
import {
    CompressedTokenProgram,
    createTokenPool,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
const connection: Rpc = createRpc(rpcUrl, rpcUrl);

export const buildCompressSplTokenTx = async (payer: string, amount: number, mintAddress: string): Promise<Transaction> => {
    try {
        // Fetch the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        let compressIx: TransactionInstruction;
        let sourceTokenAccount;
        sourceTokenAccount = await splToken.getAssociatedTokenAddress(
            new PublicKey(mintAddress),
            new PublicKey(payer)
        );

        // Compress spl tokens and add them to the transaction
        compressIx = await CompressedTokenProgram.compress({
            payer: new PublicKey(payer), // The payer of the transaction.
            owner: new PublicKey(payer), // owner of the *uncompressed* token account.
            source: sourceTokenAccount, // source (associated) token account address.
            toAddress: new PublicKey(payer), // address to send the compressed tokens to.
            amount: Number(amount), // amount of tokens to compress.
            mint: new PublicKey(mintAddress), // Mint address of the token to compress.
        });

        // Create a transaction and manually set the fee payer and blockhash
        const transaction = new Transaction();

        // Add the fee payer
        transaction.feePayer = new PublicKey(payer);

        // Add the instructions
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
            compressIx
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
