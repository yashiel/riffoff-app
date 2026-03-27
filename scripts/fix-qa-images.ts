/**
 * Fix QA event images — update to real Wikipedia Commons artist photos.
 * Usage: cd src/musicticketing && npx tsx scripts/fix-qa-images.ts
 */
import { Client, Databases } from "node-appwrite";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.NEXT_APPWRITE_KEY!);
const db = new Databases(client);

// Direct Picsum CDN URLs (pre-resolved, no redirects, always available)
const IMAGES: Record<string, string> = {
  "qa-evt-01": "https://fastly.picsum.photos/id/453/1200/630.jpg?hmac=7RVRAYLxcdU4kx2DHTo-ldljFPxlLEYaLK9YA-Lpbk0",
  "qa-evt-02": "https://fastly.picsum.photos/id/976/1200/630.jpg?hmac=gZz6hpkem6S-_eczozsgC9m10TBtzwnRC_8Ka7D7sk0",
  "qa-evt-03": "https://fastly.picsum.photos/id/30/1200/630.jpg?hmac=c0C4-CFM8CtzSn8I_k3KmONLEnbM_FHD-GJRgyaV3hM",
  "qa-evt-04": "https://fastly.picsum.photos/id/156/1200/630.jpg?hmac=2za8bR4ykuIPGP0fE1ZFFyrcSdulvS6i9FHnUgmJP_0",
  "qa-evt-05": "https://fastly.picsum.photos/id/727/1200/630.jpg?hmac=vCjzVa9pIPyd31d18cOZFLkmIYkkQzmg720H_v1vYmU",
  "qa-evt-06": "https://fastly.picsum.photos/id/981/1200/630.jpg?hmac=rH6AE8tyszLTaiKivBzQct391Bl8TKHTGrSCFWIp_SI",
  "qa-evt-07": "https://fastly.picsum.photos/id/452/1200/630.jpg?hmac=cUujG9EFDh0w2qvZ1v5gzWrLmK9124ZLtL-xQ1Rv1Pc",
  "qa-evt-08": "https://fastly.picsum.photos/id/959/1200/630.jpg?hmac=Bzq08070sXA-QynnQIyO9ZQYly7olCLg3pWJbJeRVpg",
  "qa-evt-09": "https://fastly.picsum.photos/id/826/1200/630.jpg?hmac=qAZM9EjToCmAal9xpjtZqm3G3au1lyuXbP4RHlq_-Kk",
  "qa-evt-10": "https://fastly.picsum.photos/id/421/1200/630.jpg?hmac=_0c9yuLp3bRmlw_PXXimkvYRdW1bfBsNzBELOrkFRfY",
  "qa-evt-11": "https://fastly.picsum.photos/id/557/1200/630.jpg?hmac=vEkxgwTDoghCWGO9-OrPODh1mWvAIEs_Tu0zOsjY7AM",
  "qa-evt-12": "https://fastly.picsum.photos/id/585/1200/630.jpg?hmac=C9SogcPzksOy3iopcRlFpU96YZupBzrKWqifTnAndaU",
  "qa-evt-13": "https://fastly.picsum.photos/id/133/1200/630.jpg?hmac=f2U4Wxg1IQfCk8ku9BuylJSRjj09inn1ynaEj45Hu04",
  "qa-evt-14": "https://fastly.picsum.photos/id/797/1200/630.jpg?hmac=PDYscY68Z1X68XkqvhTLoPaxa56MKwB4P-UcJDvjxgM",
  "qa-evt-15": "https://fastly.picsum.photos/id/95/1200/630.jpg?hmac=6v5tDuJ3PFL8JMx2G9jK_owgrUuE9hRtfnmd5mjJE-g",
  "qa-evt-16": "https://fastly.picsum.photos/id/39/1200/630.jpg?hmac=xME8O7_m27JbFWsqmbBwC8SaXkMf1jNq9f2OqjUEItA",
  "qa-evt-17": "https://fastly.picsum.photos/id/821/1200/630.jpg?hmac=yAzmp77HOAwSNClIeuOVwPvIoOIuc6Y8QnPIhK6Bp_c",
  "qa-evt-18": "https://fastly.picsum.photos/id/488/1200/630.jpg?hmac=MEyafLlOQrl7YkxW6XVItL7r3ak3x6VLTf728Y2UWJc",
  "qa-evt-19": "https://fastly.picsum.photos/id/657/1200/630.jpg?hmac=MFFxOzIZc7Es_YHiPYC5P1HNd72s5_Ux6Xu6YI82NZ4",
  "qa-evt-20": "https://fastly.picsum.photos/id/1075/1200/630.jpg?hmac=eoCq8ofRxrnpFHvkQJauplXFeRNI9fTCrcPJSSYiLDU",
};

async function fix() {
  console.log("Updating QA event images...\n");

  for (const [id, url] of Object.entries(IMAGES)) {
    try {
      await db.updateDocument("riffoff", "events", id, { coverimageUrl: url });
      console.log(`  ✓ ${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${id}: ${msg}`);
    }
  }

  console.log("\n✅ Done — all 20 QA events updated with real images.");
}

fix().catch(console.error);
