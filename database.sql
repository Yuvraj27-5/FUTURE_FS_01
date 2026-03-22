-- ============================================
-- FolioHub Database Schema
-- Run this file in MySQL: mysql -u root -p < database.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS foliohub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE foliohub;

-- ─── USERS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  headline    VARCHAR(200),
  bio         TEXT,
  avatar      VARCHAR(255) DEFAULT NULL,
  cover_photo VARCHAR(255) DEFAULT NULL,
  location    VARCHAR(100),
  website     VARCHAR(255),
  github      VARCHAR(255),
  linkedin    VARCHAR(255),
  twitter     VARCHAR(255),
  is_pro      BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  work_type   ENUM('freelance','full_time','both','not_available') DEFAULT 'both',
  skills      TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── PROJECTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  category     VARCHAR(50) NOT NULL DEFAULT 'Web Development',
  tags         TEXT,
  cover_image  VARCHAR(255),
  live_url     VARCHAR(255),
  github_url   VARCHAR(255),
  views        INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  featured     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── PROJECT IMAGES ──────────────────────────
CREATE TABLE IF NOT EXISTS project_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── LIKES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  project_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (user_id, project_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── COMMENTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  project_id INT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── FOLLOWS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_follow (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── SAVED / BOOKMARKS ───────────────────────
CREATE TABLE IF NOT EXISTS saved_projects (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  project_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_save (user_id, project_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── NOTIFICATIONS ───────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  from_user  INT,
  type       ENUM('like','comment','follow','view','job_match','system') NOT NULL,
  message    VARCHAR(500) NOT NULL,
  link       VARCHAR(255),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── MESSAGES ────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  subject     VARCHAR(200),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── JOBS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  poster_id    INT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  category     VARCHAR(100),
  location     VARCHAR(100),
  job_type     ENUM('remote','onsite','hybrid') DEFAULT 'remote',
  budget_min   DECIMAL(10,2),
  budget_max   DECIMAL(10,2),
  skills_required TEXT,
  status       ENUM('open','closed','filled') DEFAULT 'open',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poster_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── PROFILE VIEWS ───────────────────────────
CREATE TABLE IF NOT EXISTS profile_views (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  viewer_id  INT,
  ip_address VARCHAR(45),
  viewed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SEED DATA (Demo Users + Projects)
-- ============================================

-- Demo Users (password: "password123" for all)
INSERT IGNORE INTO users (username, email, password, full_name, headline, bio, location, is_pro, work_type, skills, is_available) VALUES
('demo_user', 'demo@foliohub.io', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Your Name', 'Full Stack Developer · React · Node.js · Python', 'Building scalable web applications with React, Node.js & Python. Open to internships and full-time opportunities.', 'Tamil Nadu, India', FALSE, 'both', 'React,Node.js,Python,MySQL,MongoDB', TRUE),
('priya_dev', 'priya@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya Mehta', 'UI/UX Designer & Frontend Developer', 'Designing intuitive user experiences for web and mobile. Specialized in design systems and component libraries.', 'Mumbai, India', TRUE, 'freelance', 'Figma,React,CSS,TypeScript,Adobe XD', TRUE),
('rohan_codes', 'rohan@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rohan Kumar', 'Backend Engineer · Python · Django · AWS', 'Backend engineer with 4+ years building APIs, microservices and cloud infrastructure.', 'Bangalore, India', FALSE, 'full_time', 'Python,Django,AWS,PostgreSQL,Docker', FALSE),
('alex_design', 'alex@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alex Studio', 'Brand Designer · Visual Identity · Motion', 'Award-winning brand designer with work featured in Awwwards and Behance galleries.', 'Berlin, Germany', TRUE, 'freelance', 'Branding,Figma,After Effects,Illustrator', TRUE),
('neo_studio', 'neo@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Neo Creative Studio', 'Full Service Creative Agency', 'Boutique design & development studio creating award-winning digital experiences for global brands.', 'Tokyo, Japan', TRUE, 'freelance', 'Web Design,React,Node.js,Branding,Motion', TRUE),
('sara_illustrates', 'sara@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sara Khan', 'Illustrator & 3D Artist', 'Creating editorial illustrations and 3D art for publishing, advertising, and brands worldwide.', 'Dubai, UAE', TRUE, 'both', 'Illustration,Blender,Procreate,Photoshop', TRUE);

-- Demo Projects
INSERT IGNORE INTO projects (user_id, title, description, category, tags, live_url, github_url, views, featured) VALUES
(1, 'E-Commerce Platform', 'Full-stack shopping platform with React frontend, Node.js backend, Stripe payments, and admin dashboard. Features real-time inventory management and order tracking.', 'Web Development', 'React,Node.js,MongoDB,Stripe,Redux', 'https://demo.foliohub.io', 'https://github.com/demo/ecommerce', 1247, TRUE),
(1, 'AI Chat Assistant', 'Intelligent chatbot powered by OpenAI API with custom system prompts, conversation history persistence, and a beautiful real-time streaming interface.', 'AI / ML', 'Python,FastAPI,OpenAI,React,WebSocket', 'https://demo.foliohub.io', 'https://github.com/demo/ai-chat', 892, FALSE),
(1, 'Analytics Dashboard', 'Real-time business intelligence dashboard with D3.js charts, filterable data tables, CSV export, and role-based access control.', 'Web Development', 'React,D3.js,Express,MySQL', 'https://demo.foliohub.io', 'https://github.com/demo/analytics', 634, FALSE),
(1, 'Task Manager App', 'Collaborative project management tool with drag-and-drop Kanban boards, real-time updates via WebSocket, and Slack integration.', 'Web Development', 'Next.js,TypeScript,PostgreSQL,Socket.io', 'https://demo.foliohub.io', 'https://github.com/demo/tasks', 421, FALSE),
(2, 'Design System Pro', 'Comprehensive UI component library with 200+ components, dark/light themes, accessibility compliance, and full Storybook documentation.', 'UI/UX Design', 'Figma,React,TypeScript,Storybook', 'https://demo.foliohub.io', NULL, 3201, TRUE),
(2, 'Fintech Mobile App', 'Complete iOS/Android app redesign for a fintech startup. Dark mode UI with smooth micro-animations and a 47% improvement in user engagement.', 'Mobile App', 'Figma,React Native,Lottie', 'https://demo.foliohub.io', NULL, 2847, FALSE),
(3, 'Microservices API', 'Production-grade microservices architecture with Docker, Kubernetes, and automated CI/CD pipelines. Handles 10K+ requests per second.', 'Web Development', 'Python,Docker,Kubernetes,Redis,PostgreSQL', NULL, 'https://github.com/demo/microservices', 1890, FALSE),
(4, 'Brand Identity System', 'Complete visual identity for a global sustainability brand. Logo design, typography system, color palette, and 60+ page brand guidelines.', 'Branding', 'Illustrator,Figma,InDesign', 'https://demo.foliohub.io', NULL, 4521, TRUE),
(5, 'DARKNODE Web Experience', 'Award-winning immersive web experience with WebGL shaders, custom scroll interactions, and 3D particle systems. Featured on Awwwards Site of the Day.', 'Web Development', 'Three.js,GSAP,WebGL,JavaScript', 'https://demo.foliohub.io', NULL, 18700, TRUE),
(6, 'NYT Editorial Illustrations', 'Series of 12 editorial illustrations for The New York Times digital edition covering climate change stories.', 'Illustration', 'Procreate,Photoshop,Illustration', NULL, NULL, 3200, FALSE);

-- Demo Likes
INSERT IGNORE INTO likes (user_id, project_id) VALUES
(2,1),(3,1),(4,1),(5,1),(2,2),(3,2),(4,3),(5,4),(1,5),(3,5),(1,6),(4,8),(5,9),(1,9),(2,9),(3,9);

-- Demo Comments
INSERT IGNORE INTO comments (user_id, project_id, content) VALUES
(2, 1, 'Incredible architecture! Love how you handled the cart state management.'),
(3, 1, 'The Stripe integration is seamless. Great work on error handling!'),
(4, 5, 'This design system is top-notch. The token structure is exactly what we needed.'),
(1, 9, 'Absolutely mind-blowing. How did you achieve that WebGL effect?'),
(5, 4, 'The drag-and-drop is super smooth. What library are you using for that?');

-- Demo Notifications
INSERT IGNORE INTO notifications (user_id, from_user, type, message, link) VALUES
(1, 2, 'like', 'Priya Mehta liked your project "E-Commerce Platform"', '/project/1'),
(1, 3, 'comment', 'Rohan Kumar commented on your project "E-Commerce Platform"', '/project/1'),
(1, 4, 'follow', 'Alex Studio started following you', '/profile/alex_design'),
(1, NULL, 'job_match', 'New job match: Frontend Developer at Atlassian', '/jobs'),
(1, NULL, 'view', 'A recruiter from Google viewed your profile', '/profile/demo_user');

-- Demo Follows
INSERT IGNORE INTO follows (follower_id, following_id) VALUES
(2,1),(3,1),(4,1),(5,1),(1,2),(1,4),(1,5);
