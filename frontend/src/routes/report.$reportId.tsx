import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/spinner";
import "@/index.css";
import { cn, timestampToDate } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, CircleUserRound, ExternalLink, GitCompare } from "lucide-react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import * as coy from "react-syntax-highlighter/dist/cjs/styles/prism/coy";
import * as materialDark from "react-syntax-highlighter/dist/cjs/styles/prism/material-dark";

export const Route = createFileRoute("/report/$reportId")({
    loader: ({ params: { reportId } }) => parseInt(reportId),
    component: Report,
    errorComponent: () => {
        return <p>Error</p>;
    },
    notFoundComponent: () => {
        return <p>Error</p>;
    },
});

interface SubmissionProps {
    isOpen: boolean;
    submission: Submission;
    className: string;
}

const SubmissionCode = ({ isOpen, submission, className }: SubmissionProps) => {
    const { theme } = useTheme();

    const submissionToSyntaxHighlighterLanguage = (language: string) => {
        switch (language) {
            case "python2":
                return "python";
            case "python3":
                return "python";
            default:
                return language;
        }
    };
    return (
        isOpen && (
            <ScrollArea className={cn("w-full rounded-md border", className)}>
                <pre className="bg-muted p-4 rounded-md">
                    <SyntaxHighlighter
                        language={submissionToSyntaxHighlighterLanguage(submission.language)}
                        style={theme === "light" ? coy.default : materialDark.default}
                    >
                        {submission.code}
                    </SyntaxHighlighter>
                </pre>
            </ScrollArea>
        )
    );
};

interface PlagiarismGroupProps {
    isOpen: boolean;
    id: number;
    contestSlug: string;
}

interface Submission {
    id: number;
    userSlug: string;
    date: number;
    page: number;
    code: string;
    language: string;
}

interface Plagiarism {
    id: number;
    confidencePercentage: number;
    language: string;
    submissions: Submission[];
}

interface ComparisonDialogProps {
    contestSlug: string;
    comparedSubmissions: Submission[];
    callback: VoidFunction | undefined;
}

const ComparisonDialog = ({ contestSlug, comparedSubmissions, callback }: ComparisonDialogProps) => {
    const [isOpen, setOpen] = useState<boolean>(true);

    const toggleOpenAndCallback = () => {
        setOpen((prev) => !prev);
        if (callback !== undefined) {
            callback!();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={toggleOpenAndCallback}>
            <DialogContent className="min-w-[80%] w-[80%] h-[90%]">
                <DialogHeader>
                    <DialogTitle>Compare submissions</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {comparedSubmissions.map((submission) => (
                        <div key={submission.id} className="flex flex-col w-full h-auto">
                            <Card className="mb-4 mx-2">
                                <CardHeader className="p-0">
                                    <CardTitle>
                                        <Button variant="ghost" className="w-full h-auto py-4 px-6">
                                            <div className="flex justify-between w-full">
                                                <div className="columns-2 flex gap-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://leetcode.com/${submission.userSlug}`,
                                                                "_blank",
                                                            )
                                                        }
                                                    >
                                                        <CircleUserRound className="h-4 w-4 mr-2" />
                                                        {submission.userSlug}
                                                    </Button>
                                                    <p className="my-auto">{timestampToDate(submission.date)}</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://leetcode.com/contest/${contestSlug}/ranking/${submission.page}/`,
                                                                "_blank",
                                                            )
                                                        }
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Contest page
                                                    </Button>
                                                </div>
                                            </div>
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <SubmissionCode isOpen={true} submission={submission} className="h-[60rem]" />
                            </Card>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const PlagiarismGroup = ({ contestSlug, isOpen, id }: PlagiarismGroupProps) => {
    const [isFetched, setIsFetched] = useState<boolean>(false);
    const [plagiarism, setPlagiarism] = useState<Plagiarism | undefined>(undefined);
    const [expandedSubmissions, setExpandedSubmissions] = useState<number[]>([]);
    const [comparedSubmissions, setComparedSubmissions] = useState<number[]>([]);

    const toggleGroup = (id: number) =>
        setExpandedSubmissions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));

    const toggleCompared = (id: number) => {
        setComparedSubmissions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
    };

    const handleInternalButtonClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    useEffect(() => {
        if (!isOpen || isFetched) {
            return;
        }
        fetch(`/api/v1/plagiarism/${id}`)
            .then((res) => res.json())
            .then((fetchedPlagiarism) => {
                setPlagiarism(fetchedPlagiarism);
                setIsFetched(true);
            });
    }, [isOpen, isFetched, id]);

    return (
        <CollapsibleContent>
            {!isFetched ? (
                <LoadingSpinner className="mt-2 space-y-1 ml-5 mb-4" />
            ) : (
                <>
                    {comparedSubmissions.length === 2 && (
                        <ComparisonDialog
                            contestSlug={contestSlug}
                            comparedSubmissions={plagiarism!.submissions.filter((sub) =>
                                comparedSubmissions.includes(sub.id),
                            )}
                            callback={() => setComparedSubmissions([])}
                        />
                    )}
                    <hr className="mb-2" />
                    <ul className="space-y-2">
                        {plagiarism?.submissions.map((submission) => (
                            <li key={submission.id}>
                                <Collapsible
                                    open={expandedSubmissions.includes(plagiarism.id)}
                                    onOpenChange={() => toggleGroup(submission.id)}
                                >
                                    <Card className="mb-4 mx-2">
                                        <CardHeader className="p-0">
                                            <CollapsibleTrigger asChild>
                                                <CardTitle>
                                                    <Button variant="ghost" className="w-full h-auto py-4 px-6">
                                                        <div className="flex justify-between w-full">
                                                            <div className="flex gap-4">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) =>
                                                                        handleInternalButtonClick(e, () => {
                                                                            window.open(
                                                                                `https://leetcode.com/${submission.userSlug}`,
                                                                                "_blank",
                                                                            );
                                                                        })
                                                                    }
                                                                >
                                                                    <CircleUserRound className="h-4 w-4 mr-2" />
                                                                    {submission.userSlug}
                                                                </Button>
                                                                <p className="my-auto">
                                                                    {timestampToDate(submission.date)}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-4">
                                                                <Button
                                                                    variant={
                                                                        comparedSubmissions.includes(submission.id)
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    size="sm"
                                                                    onClick={(e) =>
                                                                        handleInternalButtonClick(e, () => {
                                                                            toggleCompared(submission.id);
                                                                        })
                                                                    }
                                                                >
                                                                    <GitCompare className="h-4 w-4 mr-2" />
                                                                    Compare
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) =>
                                                                        handleInternalButtonClick(e, () => {
                                                                            window.open(
                                                                                `https://leetcode.com/contest/${contestSlug}/ranking/${submission.page}/`,
                                                                                "_blank",
                                                                            );
                                                                        })
                                                                    }
                                                                >
                                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                                    Contest page
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {expandedSubmissions.includes(submission.id) ? (
                                                            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 shrink-0 ml-2" />
                                                        )}
                                                    </Button>
                                                </CardTitle>
                                            </CollapsibleTrigger>
                                        </CardHeader>
                                        <SubmissionCode
                                            isOpen={expandedSubmissions.includes(submission.id)}
                                            submission={submission}
                                            className="h-[50rem]"
                                        />
                                    </Card>
                                </Collapsible>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </CollapsibleContent>
    );
};

interface PlagiarismMetadata {
    id: number;
    numberOfSubmissions: string;
    language: string;
    confidencePercentage: number;
}

interface DetectorRun {
    id: number;
    detector: number;
    parameters: string;
    questionId: number;
    plagiarismIds: number[];
}

interface Contest {
    id: number;
    slug: string;
    questionIds: number[];
}

interface Question {
    id: number;
    number: number;
    numberInContest: number;
    name: string;
    contestId: number;
}

function Report() {
    const detectorRunId = parseInt(Route.useLoaderData());
    const [detectorRun, setDetectorRun] = useState<DetectorRun>();
    const [plagiarismsMetadata, setPlagiarismsMetadata] = useState<PlagiarismMetadata[]>();
    const [contest, setContest] = useState<Contest>();
    const [question, setQuestion] = useState<Question>();
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

    const toggleGroup = (groupId: number) => {
        setExpandedGroups((prev) =>
            prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
        );
    };

    useEffect(() => {
        fetch(`/api/v1/detectorRuns/${detectorRunId}`)
            .then((res) => res.json())
            .then((detectorRun: DetectorRun) => {
                setDetectorRun(detectorRun);
            });
    }, [detectorRunId]);

    useEffect(() => {
        if (detectorRun !== undefined) {
            fetch(`/api/v1/plagiarismsMetadata?detectorRunId=${detectorRun.id}`)
                .then((res) => res.json())
                .then((plagiarismsMetadata: PlagiarismMetadata[]) => {
                    plagiarismsMetadata.sort((a, b) =>
                        a.numberOfSubmissions < b.numberOfSubmissions ||
                        (a.numberOfSubmissions === b.numberOfSubmissions && a.language < b.language)
                            ? 1
                            : -1,
                    );
                    setPlagiarismsMetadata(plagiarismsMetadata);
                    return fetch(`/api/v1/question/${detectorRun.questionId}`);
                })
                .then((res) => res.json())
                .then((question) => {
                    setQuestion(question);
                    return fetch(`/api/v1/contest/${question.contestId}`);
                })
                .then((res) => res.json())
                .then((contest) => {
                    setContest(contest);
                });
        }
    }, [detectorRun]);

    return detectorRun && contest && question && plagiarismsMetadata ? (
        <div className="container mx-auto p-4">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>
                        <div className="columns-2">
                            <div>
                                [Q{question.numberInContest}] {question.number}. {question.name}
                            </div>
                            <div className="text-right">
                                <p>{contest.slug}</p>
                            </div>
                        </div>
                    </CardTitle>
                    <CardDescription>
                        {detectorRun.detector} ({detectorRun.parameters})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {plagiarismsMetadata.map((plagiarism) => (
                            <li key={plagiarism.id}>
                                <Collapsible
                                    open={expandedGroups.includes(plagiarism.id)}
                                    onOpenChange={() => toggleGroup(plagiarism.id)}
                                >
                                    <Card className="mb-4">
                                        <CardHeader className="p-0">
                                            <CollapsibleTrigger asChild>
                                                <CardTitle>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-between items-center h-auto py-4 px-6"
                                                    >
                                                        <span className="font-semibold text-left">
                                                            {plagiarism.language}, {plagiarism.numberOfSubmissions}{" "}
                                                            users
                                                        </span>
                                                        {expandedGroups.includes(plagiarism.id) ? (
                                                            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 shrink-0 ml-2" />
                                                        )}
                                                    </Button>
                                                </CardTitle>
                                            </CollapsibleTrigger>
                                        </CardHeader>
                                        <PlagiarismGroup
                                            isOpen={expandedGroups.includes(plagiarism.id)}
                                            id={plagiarism.id}
                                            contestSlug={contest.slug}
                                        />
                                    </Card>
                                </Collapsible>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    ) : (
        <div className="flex items-center justify-center h-screen">
            <LoadingSpinner size={100} />
        </div>
    );
}
