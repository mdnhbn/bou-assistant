FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY service/requirements.txt /app/service/requirements.txt
RUN pip install --no-cache-dir -r /app/service/requirements.txt
COPY . /app
RUN mkdir -p /app/service/data
EXPOSE 8000
CMD ["uvicorn", "service.app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
