import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
} from '@solana/actions';
import { PublicKey } from '@solana/web3.js';
import { buildCompressSplTokenTx } from '@/app/services/compression/compressSplToken';
import { getCompressedTokens } from '@/app/services/compression/getCompressedTokens';

const SOLANA_MAINNET_USDC_PUBKEY = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const headers = createActionHeaders();

// GET handler to provide the actions for compressing and decompressing Spl Token
export const GET = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { toPubkey } = validatedQueryParams(requestUrl);

        const baseHref = new URL(
            `/api/actions/compress-spl-token?to=${toPubkey.toBase58()}`,
            requestUrl.origin
        ).toString();

        const payload: ActionGetResponse = {
            title: 'Compress or Decompress USDC',
            icon: 'https://i.ibb.co/Gp235BN/zk-compression.jpg/880x864',
            description: 'Compress or Decompress USDC to save or retrieve your tokens.',
            label: 'Compress or Decompress USDC',
            links: {
                actions: [
                    {
                        type: 'transaction',
                        label: 'Compress USDC', // Option to compress USDC
                        href: `${baseHref}&action=compress`,
                    },
                    {
                        type: 'transaction',
                        label: 'Decompress USDC', // Option to decompress USDC
                        href: `${baseHref}&action=decompress`,
                    },
                ],
            },
        };

        return Response.json(payload, {
            headers,
        });
    } catch (err) {
        console.error(err);
        const message = typeof err === 'string' ? err : 'An unknown error occurred';
        return new Response(message, {
            status: 400,
            headers,
        });
    }
};

// POST handler to handle compressing and decompressing Spl Token
export const POST = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { amount, toPubkey, action } = validatedQueryParams(requestUrl); // Get the action (compress or decompress)

        const body: ActionPostRequest = await req.json();

        // Validate the client-provided input
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers,
            });
        }

        if (action === 'compress') {
            // Build the Compress USDC transaction
            const transaction = await buildCompressSplTokenTx(account.toBase58(), amount, SOLANA_MAINNET_USDC_PUBKEY);

            const payload: ActionPostResponse = await createPostResponse({
                fields: {
                    type: 'transaction',
                    transaction,
                    message: `Compressed ${amount} USDC for ${toPubkey.toBase58()}`,
                },
            });

            return Response.json(payload, {
                headers,
            });
        } else if (action === 'decompress') {
            // Fetch and display compressed tokens
            const compressedTokens = await getCompressedTokens(account.toBase58());

            const payload: ActionGetResponse = {
                title: 'List of Compressed USDC Tokens',
                icon: 'https://i.ibb.co/Gp235BN/zk-compression.jpg/880x864',
                description: 'Select a compressed token to decompress.',
                label: 'Compressed USDC Tokens',
                links: {
                    actions: compressedTokens.items?.map((token) => ({
                        type: 'transaction',
                        label: `Decompress ${token.parsed?.amount} USDC from ${token.parsed?.mint}`, // Display each compressed token
                        href: `${requestUrl.origin}/api/actions/decompress-token?token=${token.parsed?.mint}`,
                    })),
                },
            };

            return Response.json(payload, {
                headers,
            });
        } else {
            return new Response('Invalid action specified', {
                status: 400,
                headers,
            });
        }
    } catch (err) {
        console.error(err);
        const message = typeof err === 'string' ? err : 'An unknown error occurred';
        return new Response(message, {
            status: 400,
            headers,
        });
    }
};

// Handle OPTIONS for CORS
export const OPTIONS = async (req: Request) => {
    return new Response(null, { headers });
};

// Helper function to validate query parameters
function validatedQueryParams(requestUrl: URL) {
    let toPubkey: PublicKey = new PublicKey("3rh9uw7wnUAJNFijUVPuxLjyEaTd984mZeWFKYVa6LgY"); // Default wallet address
    let amount: number = 0.001; // Default amount
    let action: string = 'compress'; // Default action is compress

    try {
        if (requestUrl.searchParams.get('to')) {
            toPubkey = new PublicKey(requestUrl.searchParams.get('to')!);
        }
    } catch (err) {
        throw 'Invalid input query parameter: to';
    }

    try {
        if (requestUrl.searchParams.get('amount')) {
            amount = parseFloat(requestUrl.searchParams.get('amount')!);
        }
        if (amount <= 0) throw 'amount is too small';
    } catch (err) {
        throw 'Invalid input query parameter: amount';
    }

    try {
        if (requestUrl.searchParams.get('action')) {
            action = requestUrl.searchParams.get('action')!;
        }
    } catch (err) {
        throw 'Invalid input query parameter: action';
    }

    return {
        amount,
        toPubkey,
        action,
    };
}
