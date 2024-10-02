import { clusterApiUrl, TransactionInstruction } from "@solana/web3.js";
import {
    createRpc,
    Rpc,
    bn,
    ParsedTokenAccount
} from "@lightprotocol/stateless.js";
import {
    CompressedTokenProgram,
    selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import * as splToken from "@solana/spl-token";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
const connection: Rpc = createRpc(rpcUrl, rpcUrl);

export const buildDecompressSplTokenTx = async (payer: string, mintAddress: string, compressedTokenAccounts: ParsedTokenAccount[]): Promise<Transaction> => {
    try {
        // Fetch the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction();

        // Loop through each compressed token account
        for (const account of compressedTokenAccounts) {
            const amount = account.parsed.amount.toNumber();

            // Only process accounts with a positive amount
            if (amount > 0) {
                // Select account to transfer from based on the transfer amount
                const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
                    [account],
                    amount
                );

                // Fetch recent validity proof for the input account
                const proof = await connection.getValidityProof(
                    inputAccounts.map(account => bn(account.compressedAccount.hash))
                );

                // Create the decompress instruction
                const decompressIx = await CompressedTokenProgram.decompress({
                    payer: new PublicKey(payer), // The payer of the transaction.
                    inputCompressedTokenAccounts: inputAccounts, // The selected input account.
                    toAddress: await splToken.getAssociatedTokenAddress(
                        new PublicKey(mintAddress),
                        new PublicKey(payer)
                    ), // destination (associated) token account address.
                    amount: Number(amount), // amount of tokens to decompress.
                    recentInputStateRootIndices: proof.rootIndices,
                    recentValidityProof: proof.compressedProof,
                });

                // Add the instruction to the transaction
                transaction.add(
                    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
                    decompressIx
                );
            }
        }

        // Add fee payer and recent blockhash
        transaction.feePayer = new PublicKey(payer);
        transaction.recentBlockhash = blockhash;

        // Return the unsigned transaction for client-side signing
        return transaction;
    } catch (error) {
        console.error("Error creating decompress transaction:", error);
        throw new Error("Decompress Transaction creation failed");
    }
};
