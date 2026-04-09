//Login component
import React, { useState } from 'react';
import { useNavigate , Link } from 'react-router-dom';
import { loginUser } from '../services/authService';

export default function Login() {
  const [form ,setForm] = useState({ email: '', password: '', });
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
        const res =await loginUser(form);   
        if (!res?.success) {
            setError(res.message || 'Login failed');
            return;
        }
        navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
    };

    return (
    <div className="login-container">
      <h2>Login</h2>
        <form onSubmit={handleSubmit}>
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
                    value={form.password}
                    placeholder='Password'
                    onChange={handleChange}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                {error? <p className="error">{error}</p> : null}
        </form>
        <p>Don't have an account? <Link to="/register">Register here</Link></p>
    </div>
);

};