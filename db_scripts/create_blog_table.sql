-- Blog Posts Table
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255),
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create RLS Policies

-- Allow public read access to published blog posts
CREATE POLICY "Allow public read of published blog posts" ON blog_posts FOR SELECT USING (is_published = true);

-- Allow public to read all blog posts in admin view if authenticated via app logic (or just leave it open for local/admin test if using service role key)
CREATE POLICY "Allow admin full access to blog posts" ON blog_posts FOR ALL USING (true);
