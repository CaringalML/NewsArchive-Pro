# Database Setup Instructions

## Quick Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `schema.sql`
4. Click **Run** to execute all queries

## What This Creates

- **6 Tables**: collections, batches, pages, ocr_results, page_metadata, processing_jobs
- **3 Views**: user_recent_batches, batch_details, page_details  
- **5 Functions**: dashboard stats, batch creation, page management, OCR updates, search
- **Security**: Row Level Security (RLS) ensuring users only see their own data
- **Performance**: Indexes on all important columns

## Verification

After running the SQL:
1. Check the **Table Editor** to see all 6 tables created
2. Go to **Authentication** → **Policies** to see RLS policies
3. Test the setup using the "API Test" in your application

That's it! Your database is ready for production use.