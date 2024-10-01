import { clusterApiUrl, TransactionInstruction } from "@solana/web3.js";
import {
    createRpc,
    Rpc,
    bn,
    ParsedTokenAccount
} from "@lightprotocol/stateless.js";
import {
    CompressedTokenProgram,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
const connection: Rpc = createRpc(rpcUrl, rpcUrl);

export const buildDecompressSplTokenTx = async (payer: string, mintAddress: string, inputAccounts: ParsedTokenAccount[], amount: number): Promise<Transaction> => {
    try {
        // Fetch the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        let decompressIx: TransactionInstruction;
        let destTokenAccount;
        destTokenAccount = await splToken.getAssociatedTokenAddress(
            new PublicKey(mintAddress),
            new PublicKey(payer)
        );

        // Fetch recent validity proof
        const proof = await connection.getValidityProof(
            inputAccounts.map(account => bn(account.compressedAccount.hash)),
        );

        // Decompress spl tokens and add them to the transaction
        decompressIx = await CompressedTokenProgram.decompress({
            payer: new PublicKey(payer), // The payer of the transaction.
            inputCompressedTokenAccounts: inputAccounts, // compressed token accounts of payer.
            toAddress: destTokenAccount, // destination (associated) token account address.
            amount: Number(amount), // amount of tokens to decompress.
            recentInputStateRootIndices: proof.rootIndices,
            recentValidityProof: proof.compressedProof,
        });

        // Create a transaction and manually set the fee payer and blockhash
        const transaction = new Transaction();

        // Add the fee payer
        transaction.feePayer = new PublicKey(payer);

        // Add the instructions
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
            decompressIx
        );

        // Set the recent blockhash
        transaction.recentBlockhash = blockhash;

        // Return the unsigned transaction for client-side signing
        return transaction;
    } catch (error) {
        console.error("Error creating decompress transaction:", error);
        throw new Error("Decompress Transaction creation failed");
    }
};
