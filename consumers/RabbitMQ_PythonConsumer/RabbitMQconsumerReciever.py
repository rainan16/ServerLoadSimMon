#!/usr/bin/env python3

# RECIEVER
import pika
import os
import psutil
import json

pid = os.getpid()
py = psutil.Process(pid)
py.cpu_percent(interval=0.1)

###########################################################################################################
# SEND TO ReturnQueue
###########################################################################################################
def sendToReturnQueue(jsonText):
	queue_name='ConsumerReturnQueue'
	host_name="localhost"

	sieve(5000) 
	cpupercent = py.cpu_percent() / psutil.cpu_count()

	connection = pika.BlockingConnection(pika.ConnectionParameters(host_name))
	channel = connection.channel()
	channel.queue_declare(queue=queue_name, durable=True)

	decodedJSON = json.loads(jsonText)
	decodedJSON.update({'consumerCPUused':cpupercent})
	newJSON = json.dumps(decodedJSON)
	channel.basic_publish(exchange='ServermonExchange',
						  routing_key='rountingKeyReturnQueue',
						  body=newJSON)
	print("Sent '" + newJSON + "'")
	connection.close()
	

###########################################################################################################
# MAIN - wait for Messages
###########################################################################################################
def waitForMessages():
	routing_key="routingKeyCPU"
	queue_name="NodePublishQueueCPU"
	exchange_name="ServermonExchange"
	host_name="localhost"

	connection = pika.BlockingConnection(pika.ConnectionParameters(host=host_name))

	channel = connection.channel()
	channel.exchange_declare(exchange=exchange_name, exchange_type='direct')
	channel.queue_declare(queue=queue_name, durable=True)
	channel.queue_bind(exchange=exchange_name, queue=queue_name, routing_key=routing_key)

	print(' [*] Waiting Messages from NodePublishQueue. To exit press CTRL+C')

	def callback(ch, method, properties, body):
		#print(" [x] %r:%r" % (method.routing_key, body))
		jsonText = body	
		sendToReturnQueue(jsonText)

	channel.basic_consume(callback,
						  queue=queue_name,
						  no_ack=True)

	channel.start_consuming()

###########################################################################################################
# produce CPU
###########################################################################################################
def sieve(n):
	multiples=[]
	for i in range(2,n+1):
		if i not in multiples:
			for j in range(i*i,n+1,i):
				multiples.append(j)


waitForMessages()
