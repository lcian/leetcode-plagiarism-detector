<div align="center">
	<img align="center" src="https://github.com/user-attachments/assets/3a05ad19-289e-4f47-bd26-f5f9dd3ae9e0" width="7%" alt="LeetCode plagiarism detector logo">
	<h1>LeetCode plagiarism detector</h1>
</div>
<p align="center">
    <a href="https://leetcode-plagiarism-detector-1a267dde2df3.herokuapp.com/">🔗 Automated plagiarism reports for LeetCode Contests</a>
</p>
<p align="center">
<img alt="Java" src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" />
<img alt="Spring Boot" src="https://img.shields.io/badge/Spring%20Boot-6DB33F?logo=springboot&logoColor=fff" />
<img alt="separator" height="20" src="https://github.com/user-attachments/assets/5a8e5260-544e-4641-946a-46c2c75721f3" />
<img alt="Python" src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=fff" />
<img alt="separator" height="20" src="https://github.com/user-attachments/assets/5a8e5260-544e-4641-946a-46c2c75721f3" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" />
<img alt="React" src="https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB" />
<img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white" />
<img alt="separator" height="20" src="https://github.com/user-attachments/assets/5a8e5260-544e-4641-946a-46c2c75721f3" />
<img alt="Postgres" src="https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white" />
<img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff" />
<img alt="AWS" src="https://img.shields.io/badge/AWS-%23FF9900.svg?logo=amazon-web-services&logoColor=white" />
</p>

## 📍 Overview

LeetCode Plagiarism Detector is an automated system to scrape, detect, and report plagiarized submissions in LeetCode Contests.

#### ❓ Motivation

In the last few months, LeetCode's DSA contests have seen a large increase in plagiarism.
This has diminished the credibility of the contest rankings and the overall experience for serious participants.
[[1](https://leetcode.com/discuss/general-discussion/5478175/On-solving-the-cheating-epidemic%3A-Opinion/)]
[[2](https://leetcode.com/discuss/feedback/4144304/(LC-Replied)-So-frustrated-because-of-cheating-in-contest/)]
[[3](https://leetcode.com/discuss/feedback/4812899/What-does-Leetcode-actually-do-about-cheaters/)]

Leetcode Plagiarism Detector aims to help the LeetCode community to solve this problem by providing open source, automated plagiarism reports.
Its web interface makes it easy for users to identify and report cheaters, so that LeetCode can verify instances of plagiarism and take appropriate action.

#### ✨ Features

- Automated scraping of submissions for new LeetCode contests (Python scripts)
- Plagiarism detection using advanced algorithms (currently based on <a href="https://github.com/blingenf/copydetect">copydetect</a>, more detectors coming soon)
- REST API for storing and retrieving plagiarism reports (Spring Boot + Hibernate + Postgres as the underlying database)
- User-friendly web interface for reviewing and reporting plagiarism (React + TailwindCSS)
- Scalable and cost-effective deployment (AWS Fargate spot instances + StepFunctions + Heroku)

## 📐 Architecture

![architecture](https://github.com/user-attachments/assets/bfc612ab-927b-4e97-81a3-8345a630db8d)
