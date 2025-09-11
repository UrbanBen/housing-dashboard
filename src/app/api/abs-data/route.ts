import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    console.log('Server-side: Fetching ABS Excel data...');
    
    const ABS_EXCEL_URL = 'https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/jul-2025/8731006.xlsx';
    
    const response = await axios.get(ABS_EXCEL_URL, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds timeout for server-side
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Housing-Dashboard-Server/1.0)',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });

    console.log(`Server-side: Successfully fetched ${response.data.byteLength} bytes from ABS`);

    // Return the Excel file data as a response
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': response.data.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Server-side: Error fetching ABS data:', error);
    
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        statusCode = error.response.status;
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        statusCode = 503;
        errorMessage = 'Network error: Unable to reach ABS server';
      } else {
        errorMessage = `Request setup error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      url: 'https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/jul-2025/8731006.xlsx'
    }, { 
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}