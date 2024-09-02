import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import "@/index.css";
import { Link } from "@tanstack/react-router";
import { BarChart, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "./ui/spinner";

interface DetectorRun {
    id: number;
    detector: number;
    plagiarismGroupsCount: number;
}

interface DetectorRunListProps {
    questionName: string;
    isOpen: boolean;
}

const DetectorRunList = (props: DetectorRunListProps) => {
    const [detectorRuns, setDetectorRuns] = useState<DetectorRun[]>([]);
    const [isFetched, setIsFetched] = useState<boolean>(false);

    useEffect(() => {
        if (!props.isOpen || isFetched) {
            return;
        }
        fetch(`/api/v1/detectorRuns?questionName=${props.questionName}`)
            .then((res) => res.json())
            .then((fetchedDetectorRuns: DetectorRun[]) => {
                setDetectorRuns(fetchedDetectorRuns);
                setIsFetched(true);
            });
    }, [props.isOpen, isFetched, props.questionName]);

    return (
        <CollapsibleContent>
            {!isFetched ? (
                <LoadingSpinner className="mt-2 space-y-1 ml-5 mb-4" />
            ) : (
                <ul className="pl-6 mt-2 space-y-1">
                    {detectorRuns.map((detectorRun) => (
                        <li key={detectorRun.id}>
                            <Link
                                to="/report/$reportId"
                                params={{
                                    reportId: detectorRun.id.toString(),
                                }}
                                className="text-blue-500 hover:underline flex items-center py-1"
                            >
                                <BarChart className="h-4 w-4 mr-2 shrink-0" />
                                <span>
                                    {detectorRun.detector} (
                                    {detectorRun.plagiarismGroupsCount === 0
                                        ? "no plagiarism groups"
                                        : detectorRun.plagiarismGroupsCount === 1
                                          ? "1 plagiarism group"
                                          : `${detectorRun.plagiarismGroupsCount} plagiarism groups`}
                                    )
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </CollapsibleContent>
    );
};

interface Question {
    id: number;
    number: number;
    numberInContest: number;
    name: string;
}

interface QuestionListProps {
    contestSlug: string;
    isOpen: boolean;
}

const QuestionList = (props: QuestionListProps) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
    const [isFetched, setIsFetched] = useState<boolean>(false);

    const toggleQuestion = (questionId: number) => {
        setExpandedQuestions((prev) =>
            prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
        );
    };

    useEffect(() => {
        if (!props.isOpen || isFetched) {
            return;
        }
        fetch(`/api/v1/questions?contestSlug=${props.contestSlug}`)
            .then((res) => res.json())
            .then((fetchedQuestions: Question[]) => {
                setQuestions(fetchedQuestions);
                setIsFetched(true);
            });
    }, [props.isOpen, isFetched, props.contestSlug]);

    return (
        <CollapsibleContent>
            {!isFetched ? (
                //<div className="pl-6 mt-2 space-y-1 ml-5 mb-4">Loading...</div>
                <LoadingSpinner className="mt-2 space-y-1 ml-5 mb-4" />
            ) : (
                <CardContent className="pt-0">
                    <ul className="space-y-2">
                        {questions.map((question) => (
                            <li key={question.id}>
                                <Collapsible
                                    open={expandedQuestions.includes(question.id)}
                                    onOpenChange={() => toggleQuestion(question.id)}
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-between items-center h-auto py-2 px-4"
                                        >
                                            <span className="font-medium text-left">
                                                [Q{question.numberInContest}] {question.number}. {question.name}
                                            </span>
                                            {expandedQuestions.includes(question.id) ? (
                                                <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 shrink-0 ml-2" />
                                            )}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <DetectorRunList
                                        isOpen={expandedQuestions.includes(question.id)}
                                        questionName={question.name}
                                    />
                                </Collapsible>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            )}
        </CollapsibleContent>
    );
};

interface Contest {
    id: number;
    slug: string;
    questionIds: number[];
}

const ContestList = () => {
    const [contests, setContests] = useState<Contest[]>([]);
    const [expandedContests, setExpandedContests] = useState<number[]>([]);

    useEffect(() => {
        fetch("/api/v1/contests/bulk")
            .then((res) => res.json())
            .then((fetchedContests: Contest[]) => {
                setContests(fetchedContests);
            });
    }, []);

    const toggleContest = (contestId: number) => {
        setExpandedContests((prev) =>
            prev.includes(contestId) ? prev.filter((id) => id !== contestId) : [...prev, contestId],
        );
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Contest Reports</h1>
            {contests.map((contest) => (
                <Collapsible
                    key={contest.id}
                    open={expandedContests.includes(contest.id)}
                    onOpenChange={() => toggleContest(contest.id)}
                >
                    <Card className="mb-4">
                        <CardHeader className="p-0">
                            <CollapsibleTrigger asChild>
                                <CardTitle>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-between items-center h-auto py-4 px-6"
                                    >
                                        <span className="font-semibold text-left">{contest.slug}</span>
                                        {expandedContests.includes(contest.id) ? (
                                            <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0 ml-2" />
                                        )}
                                    </Button>
                                </CardTitle>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <QuestionList isOpen={expandedContests.includes(contest.id)} contestSlug={contest.slug} />
                    </Card>
                </Collapsible>
            ))}
        </div>
    );
};

export { ContestList };
