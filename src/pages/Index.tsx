import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Clock, Calendar, ArrowRight } from 'lucide-react';
const Index = () => {
  return <div className="min-h-screen bg-background landing-theme force-light">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
        <div className="relative">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4">
                  <Shield className="h-8 w-8 text-primary-foreground" />
                </div>
                <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  DeskControl
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Comprehensive management system for Service Desk analysts. 
                  Manage absences, assign tasks and supervise your team efficiently.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Main Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A complete solution for Service Desk team management with specialized 
            tools for analysts and leads.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="bg-muted/40">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Absence Management</CardTitle>
              <CardDescription>
                Request and approve absences efficiently with a commenting and tracking system.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="bg-muted/40">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Task Assignment</CardTitle>
              <CardDescription>
                Assign and supervise team tasks with priorities, deadlines and progress tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="bg-muted/40">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Shift Control</CardTitle>
              <CardDescription>
                Manage schedules, work modalities (office/home) and visualize team status.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Roles Section */}
      <div className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Specialized Dashboards</h2>
            <p className="text-muted-foreground">
              Different interfaces optimized for each role in your team.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-muted/40">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-4">Analyst Dashboard</CardTitle>
                <CardDescription>
                  Tools to manage your daily work efficiently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• View absence requests</li>
                  <li>• Manage assigned tasks</li>
                  <li>• See current shift and modality</li>
                  <li>• Real-time team status</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8 bg-muted/40">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-4">Lead Dashboard</CardTitle>
                <CardDescription>
                  Complete control to supervise and manage your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Approve/reject absences</li>
                  <li>• Assign tasks to analysts</li>
                  <li>• Manage team schedules</li>
                  <li>• Absence calendar</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to optimize your Service Desk?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start using DeskControl today and transform your team management with 
            professional tools and an intuitive interface.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to="/auth">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;