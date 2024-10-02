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

        // Group input accounts by their amounts
        const amountGroups = compressedTokenAccounts.reduce((acc, account) => {
            const amount = account.parsed.amount.toNumber();
            if (amount > 0) {
                if (!acc[amount]) acc[amount] = [];
                acc[amount].push(account);
            }
            return acc;
        }, {} as { [key: number]: ParsedTokenAccount[] });

        // Create a transaction instruction for each amount group
        for (const [amount, compressedTokenAccounts] of Object.entries(amountGroups)) {
            // Select accounts to transfer from based on the transfer amount
            const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
                compressedTokenAccounts,
                amount,
            );

            // Fetch recent validity proof for all input accounts
            const proof = await connection.getValidityProof(
                inputAccounts.map(account => bn(account.compressedAccount.hash)),
            );

            const decompressIx = await CompressedTokenProgram.decompress({
                payer: new PublicKey(payer), // The payer of the transaction.
                inputCompressedTokenAccounts: inputAccounts, // compressed token accounts of payer.
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
