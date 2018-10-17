# Server-Load-Simulator-Monitor

A fast :fast_forward: server load simulation and monitoring tool, using HTML5 :page_facing_up:, javascript :page_with_curl:, node.js :satellite:, websockets :rocket:, RabbitMQ :rabbit: and bunyan for logging :book:.

## Quickstart
:exclamation: **`ATTENTION`** :exclamation: **`Currently tested on Windows 10 only!`**


**Install procedure**

Windows installation of ``RabbitMQ`` (tutorial see <https://www.rabbitmq.com/install-windows.html)>

1. Erlang: <http://www.erlang.org/download.html>
2. RabbitMQ: <https://www.rabbitmq.com/install-windows.html>
3. MariaDB: <https://mariadb.org/download/>

Install npm-packages on ``node.js`` via **package.json**, or manually:

```console
npm install websocket
npm install jquery
npm install bunyan
npm install amqplib
npm install spectre.css
npm install cpu-stat
```

Defaultsettings for MariaDB:
```
jdbc.url=jdbc:mysql://localhost:3306/testdb
jdbc.username=student
jdbc.password=student
```

**Build procedure**
1. Build CPU Consumer
   * check Python 3 is installed
   * python -m pip install --upgrade pip
   * pip3.6.exe install pika (pip in Windows usually loacted in %AppData%\Local\Programs\Python\Python36\Scripts)
   * pip3.6.exe install psutil
2. Build RAM Consumer
   * install .NET Core 2.1 SDK from [https://www.microsoft.com/net/download](https://www.microsoft.com/net/download)
   * open the .NET project [/consumers/RabbitMQ_NetConsumer/RabbitMQ_NetConsumer.sln](/consumers/RabbitMQ_NetConsumer/RabbitMQ_NetConsumer.sln) in VisualStudio 2017 
   * check nugets and build solution (see [rabbitmq_netconsumer](https://git-iit.fh-joanneum.at/raineran16/ServerLoadSimMon#ram-consumer-rabbitmq_netconsumer))
   * copy the thereby built **RabbitMQ_NetConsumer** (in Windows look for RabbitMQ_NetConsumer.dll) to your own consumer directory
   * copy the **RabbitMQ_NetConsumer.1.0.0.nupkg** to your own consumer directory - you may use the precompiled version [RabbitMQ_NetConsumer.1.0.0.nupkg](https://git-iit.fh-joanneum.at/raineran16/ServerLoadSimMon/blob/master/consumers/RabbitMQ_NetConsumer/NugetPackages/RabbitMQ_NetConsumer.1.0.0.nupkg)
3. Build DB Consumer
   * compile via Maven (Java)

**Start procedure**
1. Ensure RabbitMQ and Erlang are running
2. Start CPU Consumer
   * run RabbitMQconsumerReciever.py (e.g. on Windows use runPythonConsumer.bat)
3. Start RAM Consumer
   * check the .NET 2.1 Runtime ist installed (otherwise obtain it from [https://www.microsoft.com/net/download](https://www.microsoft.com/net/download))  
   * intall nugets ```nuget install RabbitMQ_NetConsumer.1.0.0.nupkg``` (see https://docs.microsoft.com/en-us/nuget/tools/cli-ref-install for details)
   * run the RabbitMQ_NetConsumer like ```dotnet RabbitMQ_NetConsumer.dll``` from your own consumer directory
   * alternatively you can use the precompiled sources in folder Precompiled in the folder of the consumer: ```dotnet RabbitMQ_NetConsumer.dll```
   * if this doesn't work: run the consumer solution in Visual-Studio
4. Start DB Consumer
   * run JAVA files
5. Start node.js with server.js (e.g. "node.exe server.js")
6. Check serverlog to assure everything was loaded properly
7. Open [/public/index.html](/public/index.html) in browser
8. Hit "Start simulation" button to run a new simulation

#### Consumers
##### CPU Consumer 
The CPU consumer is written in Python 3 using pika.
##### RAM Consumer (RabbitMQ_NetConsumer)
The RAM consumer is developed in C# (VisualStudio 2017) for .NET Core 2.1

``VisualStudio 2017`` - get it from: <https://www.visualstudio.com/downloads/>  
``RabbitMQ.Client nuget`` - use this nuget package: <https://www.nuget.org/packages/RabbitMQ.Client/>  
```console
PM> Install-Package RabbitMQ.Client -Version 5.0.1
```
##### DB Consumer 
The DB consumer is written in Java using the amqp-client for connecting to RabbitMQ. Database simulation by jdbc and MariaDB.

### Back-end
node.js server:
    <https://nodejs.org/en/>

logging with bunyan:
    <https://nodejs.org/en/blog/module/service-logging-in-json-with-bunyan/>

RabbitMQ and amqp on node.js:
    <https://www.rabbitmq.com/>
    <https://www.npmjs.com/package/amqplib>

### Front-end
design supported by spectre.css:
    <https://picturepan2.github.io/spectre/>
    
js support with jQuery:
    <https://jquery.com/>

## Project structure
```
.nodeJS-Server-Root
├── logs
├── node_modules
├── public
│   ├── css
│   └── js
│ ...
├── consumers // not part of the node.js server
│   ├── RabbitMQ_JavaConsumer
│   ├── RabbitMQ_NetConsumer
│   └── RabbitMQ_PythonConsumer
└── ...
```

## Dev
``RabbitMQ Management Plugins`` enable:

1. start: RabbitMQ Command Prompt (sbin dir)
2. type: "rabbitmq-plugins enable rabbitmq_management"
3. start: RabbitMQ Service - start
4. start: RabbitMQ Service - stop
5. open: <http://localhost:15672/>
6. user "guest" with password "guest"

``Websocket Server Port:`` localhost:1337  
``RabbitMQ Server Port:`` amqp://localhost:5672

## License
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
