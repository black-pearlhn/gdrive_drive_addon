var credentials = {
  "client_id": "202264815644.apps.googleusercontent.com", // rclone client_id
  "client_secret": "X4Z3ca8xfWDb1Voo-F9a7ZxJ", // rclone client_secret
  "refresh_token": "*******" // refresh token is unique
}

async function handleRequest(request) {
  const drive = new gdrive(credentials)
  let url = new URL(request.url)
  let path_split = url.pathname.split('/')
  if (path_split[1] == 'load') {
    var file_id = path_split[2]
    var file_name = path_split[3] || 'file_name.vid'
    return drive.streamFile(request.headers.get("Range"), file_id, file_name)
  }
  else if (url.pathname == '/')
    return new Response('200 Online!', { "status": 200 })
  else
    return new Response('404 Not Found!', { "status": 404 })
}

class gdrive {
  constructor(credentials) {
    this.gapihost = 'https://www.googleapis.com'
    this.credentials = credentials
  }
  async streamFile(range = "", file_id, file_name) {
    const chunkSize = 10 * 1024 * 1024; // 10 MB
    let start = 0;
    let end = chunkSize - 1;

    // Initialize readable and writable streams
    const { readable, writable } = new TransformStream();

    while (true) {
      let rangeHeader = `bytes=${start}-${end}`;
      console.log(`Requesting range: ${rangeHeader}`);

      let fetchURL = `${this.gapihost}/drive/v3/files/${file_id}?alt=media`;
      let fetchData = await this.authData();
      fetchData.headers['Range'] = rangeHeader;

      let retries = 3; // Number of retries
      let streamResp;

      // Retry loop
      while (retries > 0) {
        streamResp = await fetch(fetchURL, fetchData);

        // Check if the response is OK
        if (streamResp.ok) {
          break; // Exit retry loop on success
        } else {
          retries--;
          console.error(`Attempt failed, status: ${streamResp.status}, retries left: ${retries}`);

          // Optionally, you can add a delay before retrying
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
        }
      }

      // Check if retries were exhausted
      if (retries === 0 && !streamResp.ok) {
        console.error(`Failed to fetch range after retries: ${streamResp.status}`);
        break; // Exit the main loop if all retries fail
      }

      // Handle the successful response
      if (streamResp.status === 206) {
        // Pipe the response body to writable stream
        streamResp.body.pipeTo(writable);

        // Get the actual content length from the response
        const contentLength = parseInt(streamResp.headers.get('Content-Length'), 10);
        console.log(`Received chunk of size: ${contentLength}`);

        // Update start and end for the next chunk
        start += contentLength; // Increment start by the actual length received

        // If the received chunk size is less than chunkSize, we are at the end of the file
        if (contentLength < chunkSize) {
          console.log('End of file reached.');
          break; // End of file reached
        }

        // Set the new end for the next range request
        end = start + chunkSize - 1;
      } else if (streamResp.status === 416) {
        console.error(`Requested range not satisfiable: ${streamResp.status}`);
        break;
      } else {
        console.error(`Failed to fetch range: ${streamResp.status}`);
        break;
      }
    }

    return new Response(readable);
  }


  async accessToken() {
    //console.log("accessToken")
    if (!this.credentials.token || this.credentials.token.expires_in < Date.now()) {
      this.credentials.token = await this.fetchAccessToken()
      this.credentials.token.expires_in = Date.now() + this.credentials.token.expires_in * 1000
    }
    return this.credentials.token.access_token
  }
  async fetchAccessToken(url = `${this.gapihost}/oauth2/v4/token`) {
    //console.log("fetchAccessToken")
    let jsonBody = {
      'client_id': this.credentials.client_id,
      'client_secret': this.credentials.client_secret,
      'refresh_token': this.credentials.refresh_token,
      'grant_type': 'refresh_token'
    }
    let response = await fetch(url, { method: 'POST', body: JSON.stringify(jsonBody) })
    return await response.json()
  }
  async authData(headers = {}) {
    headers['Authorization'] = `Bearer ${await this.accessToken()}`;
    return { 'method': 'GET', 'headers': headers }
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request))
})
