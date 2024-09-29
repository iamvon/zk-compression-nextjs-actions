import {
    ActionPostResponse,
    createPostResponse,
    ActionGetResponse,
    ActionPostRequest,
    createActionHeaders,
  } from '@solana/actions';
  import { PublicKey } from '@solana/web3.js';
  import { buildCompressSolTx } from '@/app/services/compression/compressSol';
  
  const headers = createActionHeaders();
  
  // GET handler to provide the actions for compressing SOL
  export const GET = async (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      const { toPubkey } = validatedQueryParams(requestUrl);
  
      const baseHref = new URL(
        `/api/actions/compress-sol?to=${toPubkey.toBase58()}`,
        requestUrl.origin
      ).toString();
  
      const payload: ActionGetResponse = {
        title: 'Compress SOL',
        icon: 'https://i.ibb.co/Gp235BN/zk-compression.jpg/880x864',
        description: 'Compress SOL to save your rent fees.',
        label: 'Compress SOL',
        links: {
          actions: [
            {
              type: 'transaction',
              label: 'Compress 0.0001 SOL', // button text
              href: `${baseHref}&amount=${'0.0001'}`,
            },
            {
              type: 'transaction',
              label: 'Compress 0.0002 SOL', // button text
              href: `${baseHref}&amount=${'0.0002'}`,
            },
            {
              type: 'transaction',
              label: 'Compress 0.0005 SOL', // button text
              href: `${baseHref}&amount=${'0.0005'}`,
            },
            {
              type: 'transaction',
              label: 'Compress Custom Amount', // button text
              href: `${baseHref}&amount={amount}`, // this href will have a text input
              parameters: [
                {
                  name: 'amount', // parameter name in the `href` above
                  label: 'Enter the amount of SOL to compress', // placeholder of the text input
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
  
  // POST handler to build the transaction for compressing SOL
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
  
      // Build the compress SOL transaction
      const transaction = await buildCompressSolTx(account.toBase58(), amount);
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: 'transaction',
          transaction,
          message: `Compressed ${amount} SOL for ${toPubkey.toBase58()}`,
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
  