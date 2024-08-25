import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/spinner";
import "@/index.css";
import { timestampToDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, CircleUserRound, ExternalLink, FileCode, GitCompareArrows } from "lucide-react";
import { useEffect, useState } from "react";

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
}

const Submission = ({ isOpen, submission }: SubmissionProps) => {
    return (
        isOpen && (
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                <code>{submission.code}</code>
            </pre>
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

const PlagiarismGroup = ({ contestSlug, isOpen, id }: PlagiarismGroupProps) => {
    const [isFetched, setIsFetched] = useState<boolean>(false);
    const [plagiarism, setPlagiarism] = useState<Plagiarism | undefined>(undefined);
    const [expandedSubmissions, setExpandedSubmissions] = useState<number[]>([]);

    const toggleGroup = (id: number) =>
        setExpandedSubmissions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));

    useEffect(() => {
        if (!isOpen || isFetched) {
            return;
        }
        fetch(`/api/v1/plagiarism/${id}`)
            .then((res) => res.json())
            .then((fetchedPlagiarism) => {
                setPlagiarism(fetchedPlagiarism);
                console.log(fetchedPlagiarism);
                setIsFetched(true);
            });
    }, [isOpen]);

    return (
        <CollapsibleContent>
            {!isFetched ? (
                <LoadingSpinner className="mt-2 space-y-1 ml-5 mb-4" />
            ) : (
                <>
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
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-between items-center h-auto py-4 px-6"
                                                    >
                                                        <div className="flex flex-row space-x-4">
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
                                                            <p className="my-auto">
                                                                {timestampToDate(submission.date)}
                                                            </p>
                                                            <Button variant="outline" size="sm" onClick={() => {}}>
                                                                <FileCode className="h-4 w-4 mr-2" />
                                                                Show code
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => {}}>
                                                                <GitCompareArrows className="h-4 w-4 mr-2" />
                                                                Compare
                                                            </Button>
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
                                                        {expandedSubmissions.includes(submission.id) ? (
                                                            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 shrink-0 ml-2" />
                                                        )}
                                                    </Button>
                                                </CardTitle>
                                            </CollapsibleTrigger>
                                        </CardHeader>
                                        <Submission
                                            isOpen={expandedSubmissions.includes(submission.id)}
                                            submission={submission}
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
                console.log(detectorRun);
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
                        console.log(plagiarismsMetadata);
                        fetch(`/api/v1/question/${detectorRun.questionId}`)
                            .then((res) => res.json())
                            .then((question) => {
                                setQuestion(question);
                                console.log(question);
                                fetch(`/api/v1/contest/${question.contestId}`)
                                    .then((res) => res.json())
                                    .then((contest) => {
                                        setContest(contest);
                                        console.log(contest);
                                    });
                            });
                    });
            });
    }, []);

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

    //const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    //const toggleGroup = (groupId: string) => {
    //    setExpandedGroups((prev) =>
    //        prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    //    );
    //};

    //return (

    //        {groups.map((group) => (
    //            <Card key={group.id} className="mb-4">
    //                <CardHeader>
    //                    <CardTitle className="flex items-center justify-between">
    //                        <span>Plagiarism Group {group.id}</span>
    //                        <Button variant="ghost" size="sm" onClick={() => toggleGroup(group.id)}>
    //                            {expandedGroups.includes(group.id) ? (
    //                                <ChevronDown className="h-4 w-4" />
    //                            ) : (
    //                                <ChevronRight className="h-4 w-4" />
    //                            )}
    //                        </Button>
    //                    </CardTitle>
    //                </CardHeader>
    //                <CardContent>
    //                    {expandedGroups.includes(group.id) && (
    //                        <>
    //                            {group.reference && (
    //                                <div className="mb-4">
    //                                    <h4 className="text-lg font-semibold mb-2">Reference Submission</h4>
    //                                    <Accordion type="single" collapsible>
    //                                        <AccordionItem value={group.reference.id}>
    //                                            <AccordionTrigger>{group.reference.submitter}</AccordionTrigger>
    //                                            <AccordionContent>
    //                                                <pre className="bg-muted p-2 rounded-md overflow-x-auto">
    //                                                    <code>{group.reference.code}</code>
    //                                                </pre>
    //                                            </AccordionContent>
    //                                        </AccordionItem>
    //                                    </Accordion>
    //                                </div>
    //                            )}
    //                            <h4 className="text-lg font-semibold mb-2">Plagiarized Submissions</h4>
    //                            <Accordion type="single" collapsible>
    //                                {group.submissions.map((submission) => (
    //                                    <AccordionItem key={submission.id} value={submission.id}>
    //                                        <AccordionTrigger>{submission.submitter}</AccordionTrigger>
    //                                        <AccordionContent>
    //                                            <pre className="bg-muted p-2 rounded-md overflow-x-auto">
    //                                                <code>{submission.code}</code>
    //                                            </pre>
    //                                        </AccordionContent>
    //                                    </AccordionItem>
    //                                ))}
    //                            </Accordion>
    //                        </>
    //                    )}
    //                </CardContent>
    //            </Card>
    //        ))}
    //    </div>
    //);
}
