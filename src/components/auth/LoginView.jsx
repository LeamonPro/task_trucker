// src/components/auth/LoginView.jsx
import React, { useState } from 'react';
import { Briefcase, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Label } from '../ui';

const LoginView = ({ onLogin, loginError }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await onLogin(username, password);
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
            <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:scale-105 duration-300">
                <div className="text-center mb-8">
                    <Briefcase className="mx-auto h-16 w-16 text-blue-600 mb-3" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-800">Gestionnaire d'Ordres de travail</h2>
                    <p className="text-gray-500 mt-1">Connectez-vous pour acceder à votre tableau de bord</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="username-login">Nom d'utilisateur</Label>
                        <Input
                            id="username-login"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ex: admin ou chefa"
                            className="focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <Label htmlFor="password-login">Mot de passe</Label>
                        <div className="relative">
                            <Input
                                id="password-login"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Entrez le mot de passe"
                                className="focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                                aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    {loginError && (
                        <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{loginError}</p>
                    )}
                    <div>
                        <Button type="submit" className="w-full flex justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" disabled={isLoading}>
                            {isLoading ? 'Connexion en cours...' : <><LogIn className="h-5 w-5 mr-2" /> Se connecter</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
