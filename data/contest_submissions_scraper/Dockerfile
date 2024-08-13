FROM python:3.10

RUN mkdir /task
COPY . /task

WORKDIR /task
RUN pip install -r requirements.txt

CMD ["python", "scrape_and_save.py"]
