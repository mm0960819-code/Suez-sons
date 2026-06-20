const bcrypt = require('bcrypt');

// اكتب الباسورد اللي عايز تشفره هنا مكان 123456
const password = '1234';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;
    console.log('--- الكود المشفر الجديد ---');
    console.log(hash);
    console.log('---------------------------');
});