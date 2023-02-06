FROM python:3.7-slim

COPY . /assetMG

WORKDIR /assetMG

RUN pip3 install -r requirements.txt

ENTRYPOINT ["python3"]
CMD ["main.py"]
