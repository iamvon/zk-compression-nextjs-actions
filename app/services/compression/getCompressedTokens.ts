import { clusterApiUrl } from "@solana/web3.js";
import {
    createRpc,
    Rpc
} from "@lightprotocol/stateless.js";
import { PublicKey } from "@solana/web3.js";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
const connection: Rpc = createRpc(rpcUrl);

export const getCompressedTokens = async (owner: string) => {
    try {
        console.log("Using RPC URL:", rpcUrl);
        const accounts = await connection.getCompressedTokenAccountsByOwner(new PublicKey(owner));
        return accounts;
    } catch (error) {
        console.error("Error fetching compressed tokens:", error);
        throw new Error("Error fetching compressed tokens!");
    }
};