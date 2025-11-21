'use server';

const BINDERBYTE_API_KEY = '6c5cbb27946a185ee4b3beb5ae7647c4821fcbe6a899ec7109efb9674b0e9bda';
const BINDERBYTE_BASE_URL = 'https://api.binderbyte.com/v1';

export type BinderByteHistory = {
    date: string;
    desc: string;
    location: string;
};

export type BinderByteSummary = {
    awb: string;
    courier: string;
    service: string;
    status: string;
    date: string;
    desc: string;
    amount: string;
    weight: string;
};

export type BinderByteDetail = {
    origin: string;
    destination: string;
    shipper: string;
    receiver: string;
};

export type BinderByteData = {
    summary: BinderByteSummary;
    detail: BinderByteDetail;
    history: BinderByteHistory[];
};

export type BinderByteResponse = {
    status: number;
    message: string;
    data?: BinderByteData;
};

export async function trackShipment(courier: string, awb: string): Promise<BinderByteResponse> {
    if (!courier || !awb) {
        return {
            status: 400,
            message: 'Courier and Tracking Number (AWB) are required.',
        };
    }

    try {
        const url = new URL(`${BINDERBYTE_BASE_URL}/track`);
        url.searchParams.append('api_key', BINDERBYTE_API_KEY);
        url.searchParams.append('courier', courier);
        url.searchParams.append('awb', awb);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Ensure fresh data
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                status: response.status,
                message: data.message || 'Failed to fetch tracking information.',
            };
        }

        return data as BinderByteResponse;
    } catch (error) {
        console.error('BinderByte API Error:', error);
        return {
            status: 500,
            message: 'An internal server error occurred while tracking the shipment.',
        };
    }
}
