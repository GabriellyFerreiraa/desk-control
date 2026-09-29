import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Clock, Calendar, ArrowRight, GraduationCap } from 'lucide-react';
import { LangSwitch } from '@/components/LangSwitch';
import { useT } from '@/i18n/lang';
const Index = () => {
  const t = useT();
  const tl = t.landing;
  const features = [
    { icon: Calendar, title: tl.features.absencesTitle, text: tl.features.absencesText },
    { icon: Users, title: tl.features.tasksTitle, text: tl.features.tasksText },
    { icon: Clock, title: tl.features.shiftsTitle, text: tl.features.shiftsText },
    { icon: GraduationCap, title: tl.features.learningTitle, text: tl.features.learningText },
  ];
  return <div className="min-h-screen bg-background landing-theme force-light">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-background" />
        <LangSwitch className="absolute top-4 right-4 z-10" />
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
                  {tl.hero}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth?tab=signup">
                    {tl.getStarted}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Link to="/auth">
                    {tl.signIn}
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
          <h2 className="text-3xl font-bold mb-4">{tl.featuresTitle}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {tl.featuresText}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map(({ icon: Icon, title, text }) => <Card key={title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="bg-muted/40 h-full">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>)}
        </div>
      </div>

      {/* Roles Section */}
      <div className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{tl.dashboardsTitle}</h2>
            <p className="text-muted-foreground">
              {tl.dashboardsText}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { title: tl.analystTitle, text: tl.analystText, items: tl.analystItems },
              { title: tl.leadTitle, text: tl.leadText, items: tl.leadItems },
            ].map((role) => <Card key={role.title} className="p-8 bg-muted/40">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl mb-4">{role.title}</CardTitle>
                  <CardDescription>
                    {role.text}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {role.items.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{tl.ctaTitle}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            {tl.ctaText}
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to="/auth?tab=signup">
              {tl.ctaButton}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;
