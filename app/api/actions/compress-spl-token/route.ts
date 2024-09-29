import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
} from '@solana/actions';
import { PublicKey } from '@solana/web3.js';
import { buildCompressSplTokenTx } from '../../../services/compression/compressSplToken';

const SOLANA_MAINNET_USDC_PUBKEY = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const headers = createActionHeaders();

// GET handler to provide the actions for compressing Spl Token
export const GET = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { toPubkey } = validatedQueryParams(requestUrl);

        const baseHref = new URL(
            `/api/actions/compress-spl-token?to=${toPubkey.toBase58()}`,
            requestUrl.origin
        ).toString();

        const payload: ActionGetResponse = {
            title: 'Compress USDC',
            icon: 'https://i.ibb.co/Gp235BN/zk-compression.jpg/880x864',
            description: 'Compress USDC to save your rent fees.',
            label: 'Compress USDC',
            links: {
                actions: [
                    {
                        type: 'transaction',
                        label: 'Compress 0.0001 USDC', // button text
                        href: `${baseHref}&amount=${'0.0001'}`,
                    },
                    {
                        type: 'transaction',
                        label: 'Compress 0.0002 USDC', // button text
                        href: `${baseHref}&amount=${'0.0002'}`,
                    },
                    {
                        type: 'transaction',
                        label: 'Compress 0.0005 USDC', // button text
                        href: `${baseHref}&amount=${'0.0005'}`,
                    },
                    {
                        type: 'transaction',
                        label: 'Compress Custom Amount', // button text
                        href: `${baseHref}&amount={amount}`, // this href will have a text input
                        parameters: [
                            {
                                name: 'amount', // parameter name in the `href` above
                                label: 'Enter the amount of USDC to compress', // placeholder of the text input
                                required: true,
                            },
                        ],
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

// POST handler to build the transaction for compressing Spl Token
export const POST = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { amount, toPubkey } = validatedQueryParams(requestUrl);

        const body: ActionPostRequest = await req.json();

        // Validate the client provided input
        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (err) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers,
            });
        }

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

    return {
        amount,
        toPubkey,
    };
}
