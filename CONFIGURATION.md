# Appibrium Studio · Configuration & API Integration Guide

This guide explains how to connect your Appwrite database, Resend email service, and SMS API gateway to your local deployment.

---

## 1. Setup Your Local Environment File

Copy the template file to create your active local environment configuration:

```bash
cp .env.local.example .env.local
```

Now open `.env.local` in your editor and fill in the values described below.

---

## 2. Appwrite Cloud Configuration (Database & Auth)

We use Appwrite Cloud (free tier) for databases, session authentication, and file storage.

### Step 1: Create a Project
1. Go to [Appwrite Console](https://cloud.appwrite.io/) and create a free account.
2. Click **Create Project**, name it `Appibrium Studio`, and copy the **Project ID**.
3. In `.env.local`, set:
   ```env
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
   ```

### Step 2: Register Hostname
To authorize client-side queries:
1. In Appwrite Console under **Settings** → **Platforms** → **Add Platform**.
2. Select **Web App**, set the hostname to `localhost` (and later your production domain like `studio.appibrium.com`), and save.

### Step 3: Database & Collections
1. Go to **Databases** → **Create Database** and name it `appibrium_studio`. Set:
   ```env
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=appibrium_studio
   ```
2. Create the following collections with their corresponding IDs:
   - `clients`
   - `contacts`
   - `projects`
   - `proposals`
   - `invoices`
   - `invoice_items`
   - `transactions`
   - `files_metadata`
   - `notes`
   - `notifications`
   - `audit_logs`
   - `sms_logs`
   - `workspace_settings`

### Step 3: Automatic Database Provisioning
Instead of manually creating database, collections, schemas, and buckets, we created an automated provisioning script.

1. Set the `APPWRITE_API_KEY` (obtained from Appwrite Console -> API Keys under Settings) in your `.env.local` file. Make sure it has database, collection, attribute, and bucket scopes.
2. Run the following command in your terminal:
   ```bash
   npm run setup-db
   ```
This script will automatically check, create, and build:
*   The database `appibrium_studio`
*   All 12 dynamic collections with their correctly typed attributes (strings, numbers, booleans, floats)
*   The storage bucket `studio_files` for documents

---

## 3. Resend Email Integration

We use Resend to send beautifully structured transaction and proposal notifications to clients.

1. Create a free account at [Resend](https://resend.com/).
2. Under **API Keys**, click **Create API Key**.
3. Add it to your `.env.local`:
   ```env
   RESEND_API_KEY=re_your_api_key
   ```
4. Verify your sending domain (e.g. `appibrium.com`) in the Resend dashboard to send emails from your own domain.

---

## 4. Pluggable SMS API Gateway

We have a pluggable adapter built at `src/services/sms.ts` that normalizes BD mobile numbers (`+880...`) and sends HTTP requests.

Add your SMS provider parameters in `.env.local`:
```env
# The HTTP POST endpoint provided by SSL Wireless, Alpha Net, Bulk SMS BD, etc.
SMS_API_URL=https://api.your-sms-provider.com/send
# Your authorization API key / token
SMS_API_KEY=your_sms_api_key_here
# Your approved sender ID / mask (e.g., APPIBRIUM)
SMS_SENDER_ID=APPIBRIUM
```

---

## 5. Hosting & GitHub Deployment

- **Do I need to connect GitHub to Appwrite directly?**
  No, you do not need to link GitHub to Appwrite unless you plan to write custom backend Appwrite Functions deployed through Git. Since all of our business logic resides inside Next.js Server Actions and route handlers (like the PDF Puppeteer generator), you can deploy Next.js directly to **Vercel** or **Netlify** by connecting Vercel to your GitHub repo.
- Vercel will auto-build your Next.js application whenever you push to main. Just add your `.env.local` keys inside Vercel's **Environment Variables** panel.
