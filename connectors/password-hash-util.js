const bcrypt = require('bcrypt');
const db = require('./db');

// Generate hashes for seed.sql file
async function generateHashesForSeed() {
    const passwords = {
        '142005': null,
        'pass123': null,
        'pass1234': null
    };

    console.log('🔐 Generating bcrypt hashes for seed.sql...\n');

    for (const password of Object.keys(passwords)) {
        const hash = await bcrypt.hash(password, 10);
        passwords[password] = hash;
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}\n`);
    }

    console.log('\n--- Copy these into seed.sql ---\n');
    console.log(`Admin (142005): '${passwords['142005']}'`);
    console.log(`Customers (pass123): '${passwords['pass123']}'`);
    console.log(`Truck Owners (pass1234): '${passwords['pass1234']}'`);
}

// Migrate existing database passwords to hashed versions
async function migrateExistingPasswords() {
    try {
        console.log('🔄 Migrating plain text passwords to hashed passwords...\n');

        const result = await db.query('SELECT userid, email, password FROM foodtruck.users');
        
        for (const user of result.rows) {
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (user.password.startsWith('$2b$')) {
                console.log(`✓ ${user.email} - Already hashed`);
                continue;
            }

            // Hash the plain text password
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            // Update in database
            await db.query(
                'UPDATE foodtruck.users SET password = $1 WHERE userid = $2',
                [hashedPassword, user.userid]
            );
            
            console.log(`✅ ${user.email} - Password hashed (was: ${user.password})`);
        }

        console.log('\n✅ Migration complete! All passwords are now hashed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'generate' || command === 'gen') {
        await generateHashesForSeed();
        process.exit(0);
    } else if (command === 'migrate' || command === 'mig') {
        await migrateExistingPasswords();
    } else {
        console.log('Password Hashing Utility\n');
        console.log('Usage:');
        console.log('  node connectors/password-hash-util.js generate  - Generate hashes for seed.sql');
        console.log('  node connectors/password-hash-util.js migrate   - Migrate existing DB passwords to hashed\n');
        console.log('Short forms: gen, mig');
        process.exit(0);
    }
}

main();
