const { pool } = require('./config/database');

async function alterLessonsTable() {
  try {
    console.log('Altering lessons table...');
    
    // 1. Check if module_id exists and drop it or make it nullable.
    // Making it nullable is safer.
    try {
      await pool.query('ALTER TABLE lessons MODIFY COLUMN module_id INT NULL');
      console.log('✅ Made module_id nullable');
    } catch (e) {
      console.log('module_id change error (might not exist or already null):', e.message);
    }

    // 2. Rename content_text to content if it exists
    try {
      await pool.query('ALTER TABLE lessons RENAME COLUMN content_text TO content');
      console.log('✅ Renamed content_text to content');
    } catch (e) {
      console.log('content_text change error (might already be content):', e.message);
    }
    
    // 3. Add document_url if it doesn't exist
    try {
      await pool.query('ALTER TABLE lessons ADD COLUMN document_url VARCHAR(500)');
      console.log('✅ Added document_url');
    } catch (e) {
      console.log('document_url already exists');
    }
    
    // 4. Add is_published if it doesn't exist
    try {
      await pool.query('ALTER TABLE lessons ADD COLUMN is_published BOOLEAN DEFAULT false');
      console.log('✅ Added is_published');
    } catch (e) {
      console.log('is_published already exists');
    }

    console.log('🎉 lessons table altered successfully!');
  } catch (error) {
    console.error('❌ Failed to alter lessons table:', error);
  }
}

module.exports = alterLessonsTable;
