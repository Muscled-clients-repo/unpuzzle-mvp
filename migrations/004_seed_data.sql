-- Migration 004: Seed Data
-- Date: 2025-08-13
-- Purpose: Populate database with initial course content and users

-- Insert sample instructors (profiles)
insert into public.profiles (id, email, name, avatar, role) values
  ('550e8400-e29b-41d4-a716-446655440001', 'sarah.chen@example.com', 'Sarah Chen', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', 'instructor'),
  ('550e8400-e29b-41d4-a716-446655440002', 'james.miller@example.com', 'Dr. James Miller', 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', 'instructor'),
  ('550e8400-e29b-41d4-a716-446655440003', 'emily.rodriguez@example.com', 'Emily Rodriguez', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', 'instructor');

-- Insert sample subscriptions for instructors
insert into public.subscriptions (user_id, plan, status, ai_credits, max_courses, features) values
  ('550e8400-e29b-41d4-a716-446655440001', 'pro', 'active', 1000, 10, array['unlimited_courses', 'analytics', 'ai_assistant']),
  ('550e8400-e29b-41d4-a716-446655440002', 'pro', 'active', 1000, 10, array['unlimited_courses', 'analytics', 'ai_assistant']),
  ('550e8400-e29b-41d4-a716-446655440003', 'pro', 'active', 1000, 10, array['unlimited_courses', 'analytics', 'ai_assistant']);

-- Insert courses
insert into public.courses (id, title, description, thumbnail_url, instructor_id, price, duration, difficulty, tags, enrollment_count, rating, is_published, is_free) values
  (
    'course-1',
    'Shopify Freelancer on Upwork',
    'Master Shopify development and become a successful freelancer on Upwork. Learn to build custom themes, apps, and stores for clients worldwide.',
    'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',
    '550e8400-e29b-41d4-a716-446655440001',
    79.00,
    12,
    'beginner',
    array['shopify', 'freelancing', 'upwork', 'ecommerce'],
    2543,
    4.8,
    true,
    false
  ),
  (
    'course-2',
    'Shopify Upwork Top Rated Plus',
    'Scale your Shopify freelance business to Top Rated Plus status. Advanced strategies for premium clients and higher rates.',
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80',
    '550e8400-e29b-41d4-a716-446655440002',
    129.00,
    20,
    'intermediate',
    array['shopify', 'advanced-freelancing', 'premium-clients', 'scaling'],
    1832,
    4.9,
    true,
    false
  ),
  (
    'course-3',
    'Vibe Coding Course',
    'Learn coding with good vibes and modern techniques. Build real projects while maintaining work-life balance and enjoying the process.',
    'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80',
    '550e8400-e29b-41d4-a716-446655440003',
    99.00,
    15,
    'beginner',
    array['coding', 'javascript', 'react', 'wellbeing', 'work-life-balance'],
    3421,
    4.7,
    true,
    false
  );

-- Insert videos for course-1 (Shopify Freelancer)
insert into public.videos (id, course_id, title, description, duration, order_index, video_url, thumbnail_url) values
  ('1', 'course-1', 'Getting Started on Upwork as Shopify Developer', 'Introduction to freelancing on Upwork and Shopify opportunities', 930, 1, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', '/video-thumbs/intro.jpg'),
  ('2', 'course-1', 'Setting Up Your Upwork Profile', 'Create a winning Upwork profile that attracts Shopify clients', 2700, 2, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', '/video-thumbs/html.jpg'),
  ('3', 'course-1', 'Shopify Liquid Fundamentals', 'Master Shopify''s templating language for custom themes', 3000, 3, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', '/video-thumbs/css.jpg'),
  ('4', 'course-1', 'Building Custom Shopify Apps', 'Develop Shopify apps that solve real client problems', 3600, 4, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', '/video-thumbs/js.jpg'),
  ('5', 'course-1', 'Landing Your First Upwork Client', 'Complete strategy for winning your first Shopify project', 5400, 5, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', '/video-thumbs/project.jpg');

-- Insert videos for course-2 (Top Rated Plus)
insert into public.videos (id, course_id, title, description, duration, order_index, video_url, thumbnail_url) values
  ('6', 'course-2', 'Path to Top Rated Plus Badge', 'Requirements and strategies for Upwork''s highest tier', 1500, 1, 'https://sample-video.mp4', '/video-thumbs/ml-intro.jpg'),
  ('7', 'course-2', 'Premium Shopify Services', 'High-value services that command premium rates', 2400, 2, 'https://sample-video.mp4', '/video-thumbs/python-ds.jpg'),
  ('8', 'course-2', 'Linear Regression Deep Dive', 'Understanding and implementing linear regression', 3300, 3, 'https://sample-video.mp4', '/video-thumbs/linear-reg.jpg'),
  ('9', 'course-2', 'Classification Algorithms', 'Logistic regression, decision trees, and more', 3900, 4, 'https://sample-video.mp4', '/video-thumbs/classification.jpg'),
  ('10', 'course-2', 'Neural Networks Basics', 'Introduction to deep learning and neural networks', 4200, 5, 'https://sample-video.mp4', '/video-thumbs/neural-nets.jpg');

-- Insert videos for course-3 (Vibe Coding)
insert into public.videos (id, course_id, title, description, duration, order_index, video_url, thumbnail_url) values
  ('11', 'course-3', 'Coding with Good Vibes', 'Setting up your mindset and environment for enjoyable coding', 1200, 1, 'https://sample-video.mp4', '/video-thumbs/marketing-intro.jpg'),
  ('12', 'course-3', 'JavaScript for Positive Minds', 'Learn JavaScript fundamentals while staying motivated', 2100, 2, 'https://sample-video.mp4', '/video-thumbs/seo.jpg'),
  ('13', 'course-3', 'React with Good Energy', 'Building React apps with a positive, stress-free approach', 2400, 3, 'https://sample-video.mp4', '/video-thumbs/social.jpg'),
  ('14', 'course-3', 'Full-Stack Zen', 'Complete web development while maintaining inner peace', 2700, 4, 'https://sample-video.mp4', '/video-thumbs/content.jpg'),
  ('15', 'course-3', 'Analytics and Measurement', 'Tracking and optimizing marketing performance', 1800, 5, 'https://sample-video.mp4', '/video-thumbs/analytics.jpg');

-- Insert transcript entries for video 1 (with actual transcript from mock data)
insert into public.transcript_entries (video_id, start_time, end_time, text) values
  ('1', 0, 15, 'Welcome to this comprehensive introduction to web development. In this course, we''re going to explore the fundamental technologies that power the modern web.'),
  ('1', 15, 35, 'We''ll start with HTML, which stands for HyperText Markup Language. HTML is the backbone of every webpage and provides the structure and content that browsers can understand and display to users.'),
  ('1', 35, 60, 'Next, we''ll dive into CSS, or Cascading Style Sheets. CSS is what makes websites look beautiful and engaging. It controls colors, fonts, layouts, animations, and responsive design across different devices.'),
  ('1', 60, 85, 'Finally, we''ll explore JavaScript, the programming language that brings interactivity to web pages. JavaScript allows us to create dynamic user experiences, handle user input, and communicate with servers.'),
  ('1', 85, 105, 'Throughout this course, you''ll build several projects that demonstrate these concepts in action. By the end, you''ll have the skills needed to create your own websites from scratch.'),
  ('1', 105, 125, 'Let''s begin our journey into web development. Remember, the key to mastering these technologies is practice and patience. Don''t be afraid to experiment and make mistakes - that''s how we learn!');

-- Insert sample student users (for testing)
insert into public.profiles (id, email, name, avatar, role) values
  ('550e8400-e29b-41d4-a716-446655440004', 'student1@example.com', 'Alex Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', 'student'),
  ('550e8400-e29b-41d4-a716-446655440005', 'student2@example.com', 'Maria Garcia', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria', 'student'),
  ('550e8400-e29b-41d4-a716-446655440006', 'student3@example.com', 'David Kim', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', 'student');

-- Insert subscriptions for students
insert into public.subscriptions (user_id, plan, status, ai_credits, ai_credits_used, max_courses, features) values
  ('550e8400-e29b-41d4-a716-446655440004', 'free', 'active', 0, 0, 1, array['basic_courses']),
  ('550e8400-e29b-41d4-a716-446655440005', 'basic', 'active', 0, 5, 3, array['basic_courses', 'progress_tracking']),
  ('550e8400-e29b-41d4-a716-446655440006', 'pro', 'active', 500, 23, 50, array['unlimited_courses', 'ai_assistant', 'progress_tracking', 'priority_support']);

-- Insert default user preferences for all users
insert into public.user_preferences (user_id, theme, auto_play, playback_rate, volume, sidebar_width, show_chat_sidebar) values
  ('550e8400-e29b-41d4-a716-446655440001', 'light', true, 1.0, 0.8, 400, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'dark', true, 1.25, 0.9, 450, true),
  ('550e8400-e29b-41d4-a716-446655440003', 'light', false, 1.0, 0.7, 350, true),
  ('550e8400-e29b-41d4-a716-446655440004', 'light', true, 1.0, 1.0, 400, true),
  ('550e8400-e29b-41d4-a716-446655440005', 'dark', true, 1.5, 0.8, 500, false),
  ('550e8400-e29b-41d4-a716-446655440006', 'light', true, 1.25, 0.9, 400, true);

-- Insert sample enrollments
insert into public.enrollments (user_id, course_id) values
  ('550e8400-e29b-41d4-a716-446655440004', 'course-1'),
  ('550e8400-e29b-41d4-a716-446655440005', 'course-1'),
  ('550e8400-e29b-41d4-a716-446655440005', 'course-2'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-1'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-2'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-3');

-- Insert sample course progress
insert into public.course_progress (user_id, course_id, videos_completed, total_videos, percent_complete, last_accessed_at) values
  ('550e8400-e29b-41d4-a716-446655440004', 'course-1', 1, 5, 20, now() - interval '2 days'),
  ('550e8400-e29b-41d4-a716-446655440005', 'course-1', 3, 5, 60, now() - interval '1 day'),
  ('550e8400-e29b-41d4-a716-446655440005', 'course-2', 2, 5, 40, now() - interval '3 days'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-1', 5, 5, 100, now() - interval '1 week'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-2', 4, 5, 80, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440006', 'course-3', 2, 5, 40, now() - interval '2 days');

-- Insert sample video progress
insert into public.video_progress (user_id, video_id, watched_seconds, total_seconds, percent_complete, is_completed, last_watched_at) values
  -- Student 1 progress
  ('550e8400-e29b-41d4-a716-446655440004', '1', 930, 930, 100, true, now() - interval '2 days'),
  ('550e8400-e29b-41d4-a716-446655440004', '2', 1350, 2700, 50, false, now() - interval '1 day'),
  
  -- Student 2 progress
  ('550e8400-e29b-41d4-a716-446655440005', '1', 930, 930, 100, true, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 2700, 2700, 100, true, now() - interval '4 days'),
  ('550e8400-e29b-41d4-a716-446655440005', '3', 1800, 3000, 60, false, now() - interval '1 day'),
  ('550e8400-e29b-41d4-a716-446655440005', '6', 1500, 1500, 100, true, now() - interval '3 days'),
  ('550e8400-e29b-41d4-a716-446655440005', '7', 1200, 2400, 50, false, now() - interval '2 days'),
  
  -- Student 3 progress (most active)
  ('550e8400-e29b-41d4-a716-446655440006', '1', 930, 930, 100, true, now() - interval '1 week'),
  ('550e8400-e29b-41d4-a716-446655440006', '2', 2700, 2700, 100, true, now() - interval '1 week'),
  ('550e8400-e29b-41d4-a716-446655440006', '3', 3000, 3000, 100, true, now() - interval '6 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '4', 3600, 3600, 100, true, now() - interval '6 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '5', 5400, 5400, 100, true, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '6', 1500, 1500, 100, true, now() - interval '5 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '7', 2400, 2400, 100, true, now() - interval '4 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '8', 2640, 3300, 80, false, now() - interval '3 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '9', 1950, 3900, 50, false, now() - interval '2 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '11', 1200, 1200, 100, true, now() - interval '2 days'),
  ('550e8400-e29b-41d4-a716-446655440006', '12', 1260, 2100, 60, false, now() - interval '1 day');

-- Insert sample chat messages
insert into public.chat_messages (user_id, video_id, content, type, video_context) values
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'Can you explain HTML in more detail?', 'user', '{"videoId": "1", "timestamp": 25, "transcript": "HTML is the backbone of every webpage"}'),
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It uses elements (tags) to structure content like headings, paragraphs, links, and images. Think of it as the skeleton that gives your webpage its basic structure.', 'ai', '{"videoId": "1", "timestamp": 25, "transcript": "HTML is the backbone of every webpage"}'),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 'What are the best practices for Upwork profiles?', 'user', '{"videoId": "2", "timestamp": 600, "transcript": "Create a winning Upwork profile"}'),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 'For a winning Upwork profile: 1) Use a professional photo, 2) Write a compelling headline targeting your niche, 3) Create a detailed overview highlighting your skills, 4) Add relevant portfolio pieces, 5) Get skills tests certified, and 6) start with competitive rates to build reviews.', 'ai', '{"videoId": "2", "timestamp": 600, "transcript": "Create a winning Upwork profile"}'),
  ('550e8400-e29b-41d4-a716-446655440006', '6', 'How long does it typically take to get Top Rated Plus?', 'user', '{"videoId": "6", "timestamp": 300, "transcript": "Requirements and strategies for Upwork''s highest tier"}');

-- Insert sample transcript references (in/out points)
insert into public.transcript_references (user_id, video_id, text, start_time, end_time) values
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'HTML is the backbone of every webpage and provides the structure', 15, 35),
  ('550e8400-e29b-41d4-a716-446655440005', '1', 'CSS is what makes websites look beautiful and engaging', 35, 60),
  ('550e8400-e29b-41d4-a716-446655440006', '1', 'JavaScript allows us to create dynamic user experiences', 60, 85);

-- Insert sample user reflections
insert into public.user_reflections (user_id, video_id, course_id, reflection_text, reflection_type, video_timestamp) values
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'course-1', 'This introduction really helped me understand the big picture of web development. I feel more confident about starting this learning journey.', 'text', 125),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 'course-1', 'The Upwork profile tips are gold! I need to update my profile photo and rewrite my overview to be more client-focused.', 'text', 1800),
  ('550e8400-e29b-41d4-a716-446655440006', '6', 'course-2', 'Top Rated Plus seems challenging but achievable. The key metrics mentioned (client satisfaction, earnings, response time) are areas I need to focus on.', 'text', 900);

-- Insert sample AI interactions and metrics
insert into public.ai_interactions (user_id, video_id, course_id, interaction_type, credits_used, context_data) values
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'course-1', 'chat', 1, '{"topic": "HTML basics", "timestamp": 25}'),
  ('550e8400-e29b-41d4-a716-446655440004', '1', 'course-1', 'reflection_feedback', 1, '{"reflection_length": 85, "timestamp": 125}'),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 'course-1', 'chat', 1, '{"topic": "Upwork profiles", "timestamp": 600}'),
  ('550e8400-e29b-41d4-a716-446655440005', '2', 'course-1', 'reflection_feedback', 1, '{"reflection_length": 72, "timestamp": 1800}'),
  ('550e8400-e29b-41d4-a716-446655440006', '6', 'course-2', 'chat', 1, '{"topic": "Top Rated Plus timeline", "timestamp": 300}'),
  ('550e8400-e29b-41d4-a716-446655440006', '6', 'course-2', 'reflection_feedback', 1, '{"reflection_length": 95, "timestamp": 900}');

-- Insert AI metrics for today
insert into public.ai_metrics (user_id, date, total_interactions, hints_generated, quizzes_completed, reflections_submitted, credits_used) values
  ('550e8400-e29b-41d4-a716-446655440004', current_date, 2, 0, 0, 1, 2),
  ('550e8400-e29b-41d4-a716-446655440005', current_date, 2, 1, 0, 1, 2),
  ('550e8400-e29b-41d4-a716-446655440006', current_date, 3, 0, 1, 2, 3);

-- Insert AI metrics for yesterday (to show daily tracking)
insert into public.ai_metrics (user_id, date, total_interactions, hints_generated, quizzes_completed, reflections_submitted, credits_used) values
  ('550e8400-e29b-41d4-a716-446655440004', current_date - interval '1 day', 1, 0, 0, 0, 1),
  ('550e8400-e29b-41d4-a716-446655440005', current_date - interval '1 day', 3, 1, 1, 1, 3),
  ('550e8400-e29b-41d4-a716-446655440006', current_date - interval '1 day', 5, 2, 2, 1, 5);