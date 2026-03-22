// backend/setup.js - Run this ONCE to create the database tables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function setup() {
  let connection;
  try {
    // Connect without selecting a database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL');

    // Create database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'foliohub_db'}`);
    await connection.execute(`USE ${process.env.DB_NAME || 'foliohub_db'}`);
    console.log(`✅ Database '${process.env.DB_NAME}' ready`);

    // USERS TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        avatar_url VARCHAR(255),
        cover_url VARCHAR(255),
        headline VARCHAR(150),
        bio TEXT,
        location VARCHAR(100),
        country VARCHAR(60),
        city VARCHAR(60),
        website VARCHAR(200),
        github VARCHAR(200),
        linkedin VARCHAR(200),
        twitter VARCHAR(200),
        is_pro BOOLEAN DEFAULT FALSE,
        is_available BOOLEAN DEFAULT TRUE,
        availability_type ENUM('full-time','part-time','freelance','not-available') DEFAULT 'freelance',
        profile_views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users table ready');

    // CATEGORIES TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL,
        slug VARCHAR(60) UNIQUE NOT NULL,
        icon VARCHAR(10),
        sort_order INT DEFAULT 0
      )
    `);

    // Insert default categories
    await connection.execute(`
      INSERT IGNORE INTO categories (name, slug, icon, sort_order) VALUES
      ('Web Development', 'web-development', '⚛️', 1),
      ('UI/UX Design', 'ui-ux-design', '🎨', 2),
      ('Mobile Apps', 'mobile-apps', '📱', 3),
      ('AI / ML', 'ai-ml', '🤖', 4),
      ('Graphic Design', 'graphic-design', '🖼️', 5),
      ('Photography', 'photography', '📷', 6),
      ('Illustration', 'illustration', '✏️', 7),
      ('Branding', 'branding', '🏷️', 8),
      ('3D Art', '3d-art', '🎭', 9),
      ('Motion Design', 'motion-design', '🎬', 10),
      ('Data Science', 'data-science', '📊', 11),
      ('Open Source', 'open-source', '🐙', 12)
    `);
    console.log('✅ categories table ready');

    // PROJECTS TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        cover_url VARCHAR(255),
        live_url VARCHAR(200),
        github_url VARCHAR(200),
        category_id INT,
        work_type ENUM('freelance','personal','commercial','academic','open-source') DEFAULT 'personal',
        status ENUM('draft','published','archived') DEFAULT 'published',
        views INT DEFAULT 0,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    console.log('✅ projects table ready');

    // PROJECT IMAGES
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // PROJECT TAGS
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL
      )
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_tags (
        project_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (project_id, tag_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ project images & tags tables ready');

    // LIKES
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        project_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // COMMENTS
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        project_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // FOLLOWS
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // SAVES (bookmarks)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS saves (
        user_id INT NOT NULL,
        project_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // NOTIFICATIONS
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        from_user_id INT,
        type ENUM('like','comment','follow','view','job_match','featured') NOT NULL,
        project_id INT,
        message VARCHAR(300),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // JOBS
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        posted_by INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        company VARCHAR(100),
        description TEXT,
        requirements TEXT,
        location VARCHAR(100),
        job_type ENUM('full-time','part-time','freelance','contract','internship') DEFAULT 'full-time',
        work_mode ENUM('remote','onsite','hybrid') DEFAULT 'remote',
        salary_min INT,
        salary_max INT,
        currency VARCHAR(10) DEFAULT 'USD',
        category_id INT,
        status ENUM('open','closed','paused') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    console.log('✅ likes, comments, follows, saves, notifications, jobs tables ready');

    // MESSAGES
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id INT NOT NULL,
        to_user_id INT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ messages table ready');

    // Insert demo users
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const demoUsers = [
      { un: 'priya_dev', email: 'priya@demo.com', fn: 'Priya', ln: 'Mehta', hl: 'Full Stack Developer · React · Node.js', loc: 'Mumbai, India', country: 'India', city: 'Mumbai' },
      { un: 'rohan_builds', email: 'rohan@demo.com', fn: 'Rohan', ln: 'Kumar', hl: 'UI/UX Designer · Figma · Framer', loc: 'Bangalore, India', country: 'India', city: 'Bangalore' },
      { un: 'alex_codes', email: 'alex@demo.com', fn: 'Alex', ln: 'Turner', hl: 'Frontend Developer · Vue · TypeScript', loc: 'London, UK', country: 'UK', city: 'London' },
      { un: 'sara_design', email: 'sara@demo.com', fn: 'Sara', ln: 'Kim', hl: 'Brand Designer · Identity · Packaging', loc: 'Seoul, South Korea', country: 'South Korea', city: 'Seoul' },
    ];
    const hash = await bcrypt.hash('Demo@1234', 10);
    for (const u of demoUsers) {
      await connection.execute(
        `INSERT IGNORE INTO users (uuid,username,email,password_hash,first_name,last_name,headline,location,country,city,is_pro,is_available,bio) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), u.un, u.email, hash, u.fn, u.ln, u.hl, u.loc, u.country, u.city, 1, 1, `Creative professional building great things. Available for freelance work.`]
      );
    }
    console.log('✅ Demo users inserted (password: Demo@1234)');

    // Insert demo projects
    const [users] = await connection.execute('SELECT id FROM users LIMIT 4');
    const demoProjects = [
      { title: 'E-Commerce Platform', desc: 'Full-stack shopping platform with React, Node.js, MySQL, Stripe payments. Features include product catalog, cart, order management.', cat: 1, wt: 'commercial', tags: 'React,Node.js,MySQL,Stripe' },
      { title: 'AI Chat Assistant', desc: 'Intelligent chatbot powered by OpenAI API. Real-time messaging with context retention, custom system prompts.', cat: 4, wt: 'personal', tags: 'Python,FastAPI,OpenAI,React' },
      { title: 'Design System 2026', desc: 'Complete Figma design system with 200+ components. Built for scalable enterprise applications.', cat: 2, wt: 'freelance', tags: 'Figma,Design System,UI' },
      { title: 'Mobile Banking App', desc: 'iOS and Android fintech app with biometric auth, real-time transactions, and AI spending insights.', cat: 3, wt: 'commercial', tags: 'React Native,Node.js,PostgreSQL' },
      { title: 'Analytics Dashboard', desc: 'Real-time business intelligence dashboard with D3.js charts, live data, and custom reports.', cat: 11, wt: 'freelance', tags: 'React,D3.js,Node.js,WebSocket' },
      { title: 'Brand Identity — EcoLeaf', desc: 'Complete brand identity for sustainable startup. Logo, typography, color system, and brand guidelines.', cat: 8, wt: 'freelance', tags: 'Branding,Logo,Identity' },
    ];
    for (let i = 0; i < demoProjects.length; i++) {
      const dp = demoProjects[i];
      const uid = users[i % users.length].id;
      const [res] = await connection.execute(
        `INSERT INTO projects (uuid,user_id,title,description,category_id,work_type,views,likes_count) VALUES (?,?,?,?,?,?,?,?)`,
        [uuidv4(), uid, dp.title, dp.desc, dp.cat, dp.wt, Math.floor(Math.random()*5000+100), Math.floor(Math.random()*300+10)]
      );
      // Insert tags
      for (const tagName of dp.tags.split(',')) {
        const slug = tagName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        await connection.execute('INSERT IGNORE INTO tags (name,slug) VALUES (?,?)', [tagName.trim(), slug]);
        const [tag] = await connection.execute('SELECT id FROM tags WHERE slug=?', [slug]);
        if (tag.length) await connection.execute('INSERT IGNORE INTO project_tags VALUES (?,?)', [res.insertId, tag[0].id]);
      }
    }
    console.log('✅ Demo projects inserted');

    console.log('\n🎉 DATABASE SETUP COMPLETE!');
    console.log('📌 Run: npm start');
    console.log('🌐 Open: http://localhost:3000');
    console.log('👤 Demo login: priya@demo.com / Demo@1234\n');
  } catch (err) {
    console.error('❌ Setup error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setup();
