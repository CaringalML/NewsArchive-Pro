-- NewsArchive Pro Database Schema
-- Run this entire file in Supabase SQL Editor

-- ============================================================================
-- TABLES
-- ============================================================================

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ingesting', 'processing', 'qa_review', 'complete', 'error')),
    processing_options JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    original_filename TEXT NOT NULL,
    s3_image_url TEXT,
    s3_thumbnail_url TEXT,
    file_size BIGINT,
    image_width INTEGER,
    image_height INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ocr_processing', 'qa_review', 'approved', 'needs_review', 'complete', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OCR Results table
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
    raw_text JSONB,
    formatted_text TEXT,
    confidence_score DECIMAL(5,2),
    aws_job_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id)
);

-- Page Metadata table
CREATE TABLE IF NOT EXISTS page_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
    publication_name TEXT,
    publication_date DATE,
    section TEXT,
    page_title TEXT,
    language TEXT DEFAULT 'en',
    entities JSONB DEFAULT '[]',
    key_phrases JSONB DEFAULT '[]',
    sentiment JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id)
);

-- Processing Jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('textract', 'comprehend')),
    aws_job_id TEXT NOT NULL,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    s3_key TEXT,
    s3_bucket TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own collections" ON collections;
DROP POLICY IF EXISTS "Users can manage their own batches" ON batches;
DROP POLICY IF EXISTS "Users can manage their own pages" ON pages;
DROP POLICY IF EXISTS "Users can manage their own ocr_results" ON ocr_results;
DROP POLICY IF EXISTS "Users can manage their own page_metadata" ON page_metadata;
DROP POLICY IF EXISTS "Users can manage their own processing_jobs" ON processing_jobs;

-- Enable RLS on all tables
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Users can manage their own collections" ON collections
    FOR ALL USING (user_id = auth.uid());

-- Batches policies
CREATE POLICY "Users can manage their own batches" ON batches
    FOR ALL USING (user_id = auth.uid());

-- Pages policies
CREATE POLICY "Users can manage their own pages" ON pages
    FOR ALL USING (user_id = auth.uid());

-- OCR results policies
CREATE POLICY "Users can manage their own ocr_results" ON ocr_results
    FOR ALL USING (user_id = auth.uid());

-- Page metadata policies
CREATE POLICY "Users can manage their own page_metadata" ON page_metadata
    FOR ALL USING (user_id = auth.uid());

-- Processing jobs policies
CREATE POLICY "Users can manage their own processing_jobs" ON processing_jobs
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_user_id ON batches(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_collection_id ON batches(collection_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_batch_id ON pages(batch_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_ocr_results_page_id ON ocr_results(page_id);
CREATE INDEX IF NOT EXISTS idx_page_metadata_page_id ON page_metadata(page_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_aws_job_id ON processing_jobs(aws_job_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ocr_results_updated_at BEFORE UPDATE ON ocr_results FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_page_metadata_updated_at BEFORE UPDATE ON page_metadata FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Drop existing views first to avoid conflicts
DROP VIEW IF EXISTS user_recent_batches;
DROP VIEW IF EXISTS batch_details;
DROP VIEW IF EXISTS page_details;

-- Recent batches view
CREATE OR REPLACE VIEW user_recent_batches AS
SELECT 
    b.id,
    b.name,
    b.status,
    b.created_at,
    b.updated_at,
    c.name as collection_name,
    COUNT(p.id) as page_count
FROM batches b
LEFT JOIN collections c ON b.collection_id = c.id
LEFT JOIN pages p ON b.id = p.batch_id
WHERE b.user_id = auth.uid()
GROUP BY b.id, b.name, b.status, b.created_at, b.updated_at, c.name
ORDER BY b.updated_at DESC;

-- Batch details view
CREATE OR REPLACE VIEW batch_details AS
SELECT 
    b.id,
    b.name,
    b.status,
    b.created_at,
    b.updated_at,
    c.name as collection_name,
    c.id as collection_id,
    COUNT(p.id) as total_pages,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_pages,
    COUNT(CASE WHEN p.status = 'processing' THEN 1 END) as processing_pages,
    COUNT(CASE WHEN p.status = 'qa_review' THEN 1 END) as qa_review_pages,
    COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_pages,
    COUNT(CASE WHEN p.status = 'complete' THEN 1 END) as completed_pages,
    COUNT(CASE WHEN p.status = 'error' THEN 1 END) as error_pages
FROM batches b
LEFT JOIN collections c ON b.collection_id = c.id
LEFT JOIN pages p ON b.id = p.batch_id
WHERE b.user_id = auth.uid()
GROUP BY b.id, b.name, b.status, b.created_at, b.updated_at, c.name, c.id
ORDER BY b.updated_at DESC;

-- Page details view
CREATE OR REPLACE VIEW page_details AS
SELECT 
    p.id,
    p.batch_id,
    p.page_number,
    p.original_filename,
    p.s3_image_url,
    p.s3_thumbnail_url,
    p.file_size,
    p.image_width,
    p.image_height,
    p.status,
    p.created_at,
    p.updated_at,
    b.name as batch_name,
    c.name as collection_name,
    ocr.formatted_text,
    ocr.confidence_score,
    meta.publication_name,
    meta.publication_date,
    meta.section,
    meta.page_title,
    meta.language,
    meta.entities,
    meta.key_phrases,
    meta.sentiment
FROM pages p
LEFT JOIN batches b ON p.batch_id = b.id
LEFT JOIN collections c ON b.collection_id = c.id
LEFT JOIN ocr_results ocr ON p.id = ocr.page_id
LEFT JOIN page_metadata meta ON p.id = meta.page_id
WHERE p.user_id = auth.uid()
ORDER BY p.created_at DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS create_batch(TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS add_page_to_batch(UUID, INTEGER, TEXT, TEXT, TEXT, BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_page_ocr(UUID, JSONB, TEXT, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS search_user_content(UUID, TEXT, INTEGER);

-- Get dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_uuid UUID)
RETURNS TABLE(
    batches_in_progress BIGINT,
    pages_digitized_24h BIGINT,
    qa_queue_count BIGINT,
    total_archived_pages BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM batches WHERE user_id = user_uuid AND status IN ('ingesting', 'processing')) as batches_in_progress,
        (SELECT COUNT(*) FROM pages WHERE user_id = user_uuid AND created_at >= NOW() - INTERVAL '24 hours') as pages_digitized_24h,
        (SELECT COUNT(*) FROM pages WHERE user_id = user_uuid AND status = 'qa_review') as qa_queue_count,
        (SELECT COUNT(*) FROM pages WHERE user_id = user_uuid AND status IN ('approved', 'complete')) as total_archived_pages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create batch
CREATE OR REPLACE FUNCTION create_batch(
    batch_name TEXT,
    collection_id_param UUID,
    processing_options_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    batch_id UUID;
BEGIN
    INSERT INTO batches (user_id, collection_id, name, processing_options)
    VALUES (auth.uid(), collection_id_param, batch_name, processing_options_param)
    RETURNING id INTO batch_id;
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add page to batch
CREATE OR REPLACE FUNCTION add_page_to_batch(
    batch_id_param UUID,
    page_number_param INTEGER,
    original_filename_param TEXT,
    s3_image_url_param TEXT,
    s3_thumbnail_url_param TEXT DEFAULT NULL,
    file_size_param BIGINT DEFAULT NULL,
    image_width_param INTEGER DEFAULT NULL,
    image_height_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    page_id UUID;
BEGIN
    INSERT INTO pages (
        user_id, 
        batch_id, 
        page_number, 
        original_filename, 
        s3_image_url, 
        s3_thumbnail_url, 
        file_size, 
        image_width, 
        image_height
    )
    VALUES (
        auth.uid(), 
        batch_id_param, 
        page_number_param, 
        original_filename_param, 
        s3_image_url_param, 
        s3_thumbnail_url_param, 
        file_size_param, 
        image_width_param, 
        image_height_param
    )
    RETURNING id INTO page_id;
    
    RETURN page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update page OCR
CREATE OR REPLACE FUNCTION update_page_ocr(
    page_id_param UUID,
    raw_text_param JSONB,
    formatted_text_param TEXT,
    confidence_score_param DECIMAL(5,2),
    aws_job_id_param TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ocr_results (user_id, page_id, raw_text, formatted_text, confidence_score, aws_job_id)
    VALUES (auth.uid(), page_id_param, raw_text_param, formatted_text_param, confidence_score_param, aws_job_id_param)
    ON CONFLICT (page_id) 
    DO UPDATE SET 
        raw_text = raw_text_param,
        formatted_text = formatted_text_param,
        confidence_score = confidence_score_param,
        aws_job_id = aws_job_id_param,
        updated_at = NOW();
        
    -- Update page status
    UPDATE pages 
    SET status = 'qa_review', updated_at = NOW()
    WHERE id = page_id_param AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search user content
CREATE OR REPLACE FUNCTION search_user_content(
    user_uuid UUID,
    search_query TEXT,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    page_id UUID,
    batch_name TEXT,
    collection_name TEXT,
    page_number INTEGER,
    original_filename TEXT,
    s3_image_url TEXT,
    formatted_text TEXT,
    publication_name TEXT,
    publication_date DATE,
    section TEXT,
    relevance_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.batch_name,
        pd.collection_name,
        pd.page_number,
        pd.original_filename,
        pd.s3_image_url,
        pd.formatted_text,
        pd.publication_name,
        pd.publication_date,
        pd.section,
        CASE 
            WHEN LOWER(pd.formatted_text) LIKE LOWER('%' || search_query || '%') THEN 1.0
            WHEN LOWER(pd.publication_name) LIKE LOWER('%' || search_query || '%') THEN 0.8
            WHEN LOWER(pd.section) LIKE LOWER('%' || search_query || '%') THEN 0.6
            ELSE 0.1
        END as relevance_rank
    FROM page_details pd
    WHERE pd.id IN (
        SELECT p.id FROM pages p WHERE p.user_id = user_uuid
    )
    AND (
        LOWER(pd.formatted_text) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.publication_name) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.section) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.original_filename) LIKE LOWER('%' || search_query || '%')
    )
    ORDER BY relevance_rank DESC, pd.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RATE LIMITING & SECURITY
-- ============================================================================

-- Rate limiting table to track user actions
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    action_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limiting policies
CREATE POLICY "Users can manage their own rate limits" ON rate_limits
    FOR ALL USING (user_id = auth.uid());

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    action_type_param TEXT,
    max_actions INTEGER DEFAULT 100,
    window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    user_uuid UUID;
    current_window TIMESTAMPTZ;
    action_count_val INTEGER;
BEGIN
    user_uuid := auth.uid();
    
    -- Return false if user not authenticated
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate current window (rounded to the hour/minute)
    current_window := date_trunc('hour', NOW()) + 
                     (EXTRACT(minute FROM NOW())::integer / window_minutes) * 
                     (window_minutes || ' minutes')::interval;
    
    -- Get current action count for this window
    SELECT COALESCE(action_count, 0) INTO action_count_val
    FROM rate_limits 
    WHERE user_id = user_uuid 
    AND action_type = action_type_param 
    AND window_start = current_window;
    
    -- Check if limit exceeded
    IF action_count_val >= max_actions THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (user_uuid, action_type_param, 1, current_window)
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET action_count = rate_limits.action_count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate-limited batch creation function
CREATE OR REPLACE FUNCTION create_batch_with_limits(
    batch_name TEXT,
    collection_id_param UUID,
    processing_options_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    batch_id UUID;
BEGIN
    -- Check rate limit: max 10 batches per hour
    IF NOT check_rate_limit('create_batch', 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many batch creation attempts. Please try again later.';
    END IF;
    
    -- Proceed with batch creation
    INSERT INTO batches (user_id, collection_id, name, processing_options)
    VALUES (auth.uid(), collection_id_param, batch_name, processing_options_param)
    RETURNING id INTO batch_id;
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate-limited file upload function
CREATE OR REPLACE FUNCTION add_page_to_batch_with_limits(
    batch_id_param UUID,
    page_number_param INTEGER,
    original_filename_param TEXT,
    s3_image_url_param TEXT,
    s3_thumbnail_url_param TEXT DEFAULT NULL,
    file_size_param BIGINT DEFAULT NULL,
    image_width_param INTEGER DEFAULT NULL,
    image_height_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    page_id UUID;
BEGIN
    -- Check rate limit: max 50 file uploads per hour
    IF NOT check_rate_limit('upload_file', 50, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many file uploads. Please try again later.';
    END IF;
    
    -- Check file size limit (100MB)
    IF file_size_param > 104857600 THEN
        RAISE EXCEPTION 'File size exceeds limit: Maximum file size is 100MB.';
    END IF;
    
    -- Proceed with page creation
    INSERT INTO pages (
        user_id, 
        batch_id, 
        page_number, 
        original_filename, 
        s3_image_url, 
        s3_thumbnail_url, 
        file_size, 
        image_width, 
        image_height
    )
    VALUES (
        auth.uid(), 
        batch_id_param, 
        page_number_param, 
        original_filename_param, 
        s3_image_url_param, 
        s3_thumbnail_url_param, 
        file_size_param, 
        image_width_param, 
        image_height_param
    )
    RETURNING id INTO page_id;
    
    RETURN page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate-limited search function
CREATE OR REPLACE FUNCTION search_user_content_with_limits(
    user_uuid UUID,
    search_query TEXT,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    page_id UUID,
    batch_name TEXT,
    collection_name TEXT,
    page_number INTEGER,
    original_filename TEXT,
    s3_image_url TEXT,
    formatted_text TEXT,
    publication_name TEXT,
    publication_date DATE,
    section TEXT,
    relevance_rank REAL
) AS $$
BEGIN
    -- Check rate limit: max 100 searches per hour
    IF NOT check_rate_limit('search', 100, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many search requests. Please try again later.';
    END IF;
    
    -- Proceed with search
    RETURN QUERY
    SELECT 
        pd.id,
        pd.batch_name,
        pd.collection_name,
        pd.page_number,
        pd.original_filename,
        pd.s3_image_url,
        pd.formatted_text,
        pd.publication_name,
        pd.publication_date,
        pd.section,
        CASE 
            WHEN LOWER(pd.formatted_text) LIKE LOWER('%' || search_query || '%') THEN 1.0
            WHEN LOWER(pd.publication_name) LIKE LOWER('%' || search_query || '%') THEN 0.8
            WHEN LOWER(pd.section) LIKE LOWER('%' || search_query || '%') THEN 0.6
            ELSE 0.1
        END as relevance_rank
    FROM page_details pd
    WHERE pd.id IN (
        SELECT p.id FROM pages p WHERE p.user_id = user_uuid
    )
    AND (
        LOWER(pd.formatted_text) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.publication_name) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.section) LIKE LOWER('%' || search_query || '%') OR
        LOWER(pd.original_filename) LIKE LOWER('%' || search_query || '%')
    )
    ORDER BY relevance_rank DESC, pd.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADVANCED RLS POLICIES
-- ============================================================================

-- Enhanced collections policies with business logic
DROP POLICY IF EXISTS "Users can manage their own collections" ON collections;

CREATE POLICY "Users can view their own collections" ON collections
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert collections with limits" ON collections
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        -- Limit collections per user (max 50)
        (SELECT COUNT(*) FROM collections WHERE user_id = auth.uid()) < 50 AND
        -- Name must be non-empty and reasonable length
        length(trim(name)) > 0 AND length(name) <= 200
    );

CREATE POLICY "Users can update their own collections" ON collections
    FOR UPDATE USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own collections" ON collections
    FOR DELETE USING (user_id = auth.uid());

-- Enhanced batches policies with business logic
DROP POLICY IF EXISTS "Users can manage their own batches" ON batches;

CREATE POLICY "Users can view their own batches" ON batches
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert batches with limits" ON batches
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        -- Limit batches per user (max 500)
        (SELECT COUNT(*) FROM batches WHERE user_id = auth.uid()) < 500 AND
        -- Name must be non-empty and reasonable length
        length(trim(name)) > 0 AND length(name) <= 200
    );

CREATE POLICY "Users can update their own batches" ON batches
    FOR UPDATE USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own batches" ON batches
    FOR DELETE USING (user_id = auth.uid());

-- Enhanced pages policies with business logic
DROP POLICY IF EXISTS "Users can manage their own pages" ON pages;

CREATE POLICY "Users can view their own pages" ON pages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert pages with limits" ON pages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        -- Limit pages per user (max 10,000)
        (SELECT COUNT(*) FROM pages WHERE user_id = auth.uid()) < 10000 AND
        -- File size limit (100MB = 104857600 bytes)
        (file_size IS NULL OR file_size <= 104857600) AND
        -- Filename must be reasonable
        length(original_filename) > 0 AND length(original_filename) <= 255
    );

CREATE POLICY "Users can update their own pages" ON pages
    FOR UPDATE USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own pages" ON pages
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON user_recent_batches TO authenticated;
GRANT SELECT ON batch_details TO authenticated;
GRANT SELECT ON page_details TO authenticated;
GRANT SELECT ON rate_limits TO authenticated;

-- Function permissions
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_batch(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_page_to_batch(UUID, INTEGER, TEXT, TEXT, TEXT, BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_page_ocr(UUID, JSONB, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_user_content(UUID, TEXT, INTEGER) TO authenticated;

-- Rate-limited function permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_batch_with_limits(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_page_to_batch_with_limits(UUID, INTEGER, TEXT, TEXT, TEXT, BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_user_content_with_limits(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO authenticated;