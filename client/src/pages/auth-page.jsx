import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, MessageSquare, Brain, Sparkles } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    businessType: ""
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        email: formData.username,
        password: formData.password
      });
    } else {
      registerMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessType: formData.businessType
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Personas AI
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2 text-sm">
                Multi-Agent Intelligence Platform
              </CardDescription>
            </div>
            <CardTitle className="text-xl text-white">
              {isLogin ? "Welcome Back" : "Join the Collective"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isLogin 
                ? "Sign in to continue your AI conversations" 
                : "Create your account and start collaborating with AI agents"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300" data-testid="label-firstName">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="John"
                        required={!isLogin}
                        data-testid="input-firstName"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300" data-testid="label-lastName">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Doe"
                        required={!isLogin}
                        data-testid="input-lastName"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300" data-testid="label-email">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="john@example.com"
                      required={!isLogin}
                      data-testid="input-email"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300" data-testid="label-username">
                  {isLogin ? "Username or Email" : "Username"}
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder={isLogin ? "Enter username or email" : "Choose a username"}
                  required
                  data-testid="input-username"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300" data-testid="label-password">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "Create a secure password"}
                  required
                  data-testid="input-password"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="businessType" className="text-slate-300" data-testid="label-businessType">
                    Business Type
                  </Label>
                  <Select 
                    value={formData.businessType} 
                    name="businessType"
                    onValueChange={(value) => handleInputChange("businessType", value)}
                  >
                    <SelectTrigger 
                      data-testid="select-businessType"
                      className="bg-slate-700/50 border-slate-600 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-white">
                      <SelectItem value="small-business" className="focus:bg-slate-700">Small Business</SelectItem>
                      <SelectItem value="freelancer" className="focus:bg-slate-700">Freelancer</SelectItem>
                      <SelectItem value="marketing-agency" className="focus:bg-slate-700">Marketing Agency</SelectItem>
                      <SelectItem value="enterprise" className="focus:bg-slate-700">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "Access the Collective" : "Join Personas AI"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                {isLogin ? "New to the collective?" : "Already part of the collective?"}{" "}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200"
                  data-testid="button-toggle-mode"
                >
                  {isLogin ? "Create account" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Column - Hero Section */}
      <div className="flex-1 hidden lg:flex items-center justify-center p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        
        <div className="max-w-2xl text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="flex -space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-800">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-800">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-800">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-800">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Collaborate with AI Personalities
          </h1>
          <p className="text-xl mb-12 text-slate-300 leading-relaxed">
            Engage in intelligent conversations with multiple AI agents, each with unique personalities and expertise. 
            Experience the future of collaborative AI interaction.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">Multi-Agent System</h3>
              <p className="text-slate-400 text-sm">
                Interact with specialized AI agents that bring different perspectives and expertise to every conversation.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">Smart Conversations</h3>
              <p className="text-slate-400 text-sm">
                Experience natural, context-aware discussions where AI agents collaborate and build upon each other's ideas.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">Personality-Driven</h3>
              <p className="text-slate-400 text-sm">
                Each AI agent has unique characteristics, communication styles, and areas of specialization.
              </p>
            </div>
          </div>

          {/* Feature tags */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700">
              <span className="text-sm text-slate-300">🤖 5 AI Personalities</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700">
              <span className="text-sm text-slate-300">💬 Real-time Chat</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700">
              <span className="text-sm text-slate-300">🎯 Specialized Expertise</span>
            </div>
            <div className="px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700">
              <span className="text-sm text-slate-300">🚀 Intelligent Collaboration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}