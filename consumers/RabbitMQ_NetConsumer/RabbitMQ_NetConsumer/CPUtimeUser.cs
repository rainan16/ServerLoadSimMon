using System;
using System.Linq;

namespace RabbitMQ_NetConsumer
{
    internal class CPUtimeUser
    {
        private int seconds;
        private int useCores;

        public CPUtimeUser(int seconds, int useCores)
        {
            this.seconds = seconds;
            if (useCores > Environment.ProcessorCount || useCores < 1)
            {
                throw new ArgumentOutOfRangeException(nameof(useCores), useCores, $"cores range between 1 ... {Environment.ProcessorCount}");
            }
            this.useCores = useCores;
        }

        public void StartStressCPU()
        {
            Enumerable
                .Range(1, useCores)
                .AsParallel()
                .Select(i => {
                    var end = DateTime.Now + TimeSpan.FromSeconds(10);
                    while (DateTime.Now < end)
                    /* nothing to do here */
                ;
                return i;
                })
            .ToList(); // makes the query execute
        } 
    }
}
