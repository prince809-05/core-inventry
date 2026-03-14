const axios = require('axios');
axios.post('http://localhost:3001/api/auth/signup', {
    name: 'Kusum Panchal',
    email: 'kusumpanchal31@gmail.com',
    password: '9898577'
}).then(res => console.log('Success:', res.data))
    .catch(err => console.log('Error:', err.response ? err.response.data : err.message));
