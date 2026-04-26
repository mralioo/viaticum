FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-dev python3-pip \
    libsndfile1 ffmpeg wget curl sox \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Ubuntu 22.04 ships pip 22.0.2 which has a resolver bug (AssertionError on complex graphs).
# Upgrade pip + setuptools before any heavy installs.
RUN pip install --no-cache-dir "pip>=24" setuptools wheel

WORKDIR /app
COPY requirements.txt .

RUN pip install --no-cache-dir fastapi uvicorn[standard] python-multipart httpx
# numpy must be installed before nemo_toolkit[asr] — sox's setup.py imports it during metadata generation
RUN pip install --no-cache-dir numpy soundfile
RUN pip install --no-cache-dir "nemo_toolkit[asr]>=1.23" librosa

COPY main.py .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
