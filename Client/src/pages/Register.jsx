import React, { useState } from 'react';
import { useNavigate , Link } from 'react-router-dom';
import { registerUser } from '../services/authService';

export default function Register() {
  const [form ,setForm] = useState({ username: '', email: '', password: '', });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        const res =await registerUser(form);
        if (!res?.success) {
            setError(res.message || 'Registration failed');
            return;
        }
        navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }   
    };

    return (
    <div className="register-container">
      <h2>Register</h2>
        <form onSubmit={handleSubmit}>
                <input
                    name='username'
                    type="text" 
                    value={form.username}
                    placeholder='Username'
                    onChange={handleChange}
                    required
                />
                <input
                    name='email'
                    type="email"
                    value={form.email}
                    placeholder='Email'
                    onChange={handleChange}
                    required
                />
                <input
                    name='password'
                    type="password"
                    placeholder='password'
                    value={form.password}
                    onChange={handleChange}
                    required
                />  
            <button disabled={loading} type="submit">
                {loading ? 'Registering...' : 'Register'}
            </button>

            {error ? <p className="error">{error}</p> : null}
        </form>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}
