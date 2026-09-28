import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { pickLocalized } from '@/lib/localized';
import { CourseStatus, CourseSummary, loadMyCourses } from './learningData';

const STATUS_BADGE: Record<CourseStatus, 'outline' | 'secondary' | 'default'> = {
  notStarted: 'outline',
  inProgress: 'secondary',
  completed: 'default',
};

export const LearningTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = useT();
  const tl = t.learning;
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMyCourses(user.id)
      .then(setCourses)
      .catch((error) => {
        console.error('Error loading courses:', error);
        toast({ title: tl.loadFailed, variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [user, tl.loadFailed]);

  const actionLabel: Record<CourseStatus, string> = {
    notStarted: tl.start,
    inProgress: tl.continue,
    completed: tl.review,
  };

  return <Card>
      <CardHeader>
        <CardTitle>{tl.title}</CardTitle>
        <CardDescription>{tl.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t.common.loading}</p>
        ) : courses.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{tl.empty}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const percent = course.totalModules === 0 ? 0 : Math.round((course.passedModules / course.totalModules) * 100);
              const description = pickLocalized(course.description, lang);
              return <Card key={course.id} className="flex flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{pickLocalized(course.title, lang)}</CardTitle>
                      <Badge variant={STATUS_BADGE[course.status]} className="shrink-0">{tl.status[course.status]}</Badge>
                    </div>
                    {description && <CardDescription className="line-clamp-3">{description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2">
                    <Progress value={percent} className="h-2" aria-label={tl.modulesDone(course.passedModules, course.totalModules)} />
                    <p className="text-xs text-muted-foreground">
                      {course.completedAt
                        ? tl.completedOn(format(new Date(course.completedAt), 'dd/MM/yyyy'))
                        : tl.modulesDone(course.passedModules, course.totalModules)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={course.status === 'completed' ? 'outline' : 'default'}
                      onClick={() => navigate(`/learning/${course.id}`)}
                    >
                      {actionLabel[course.status]}
                    </Button>
                  </CardFooter>
                </Card>;
            })}
          </div>
        )}
      </CardContent>
    </Card>;
};
