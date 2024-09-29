import { clusterApiUrl } from "@solana/web3.js";
import {
    createRpc,
    Rpc
} from "@lightprotocol/stateless.js";
import { PublicKey } from "@solana/web3.js";

const connection: Rpc = createRpc(clusterApiUrl('mainnet-beta'));

export const getCompressedTokens = async (owner: string) => {
    try {
        const accounts = await connection.getCompressedTokenAccountsByOwner(new PublicKey(owner));
        return accounts;
    } catch (error) {
        console.error("Error getting CompressedTokens:", error);
        throw new Error("Transaction creation failed");
    }
};
