package main

import (
	"log"
	"net/http"

	gosocketio "github.com/graarh/golang-socketio"
	"github.com/graarh/golang-socketio/transport"
)

type Message struct {
	RoomID string `json:"roomID`
	Type   string `json:"type"`
	Data   string `json:"data"`
}

func main() {
	//create
	server := gosocketio.NewServer(transport.GetDefaultWebsocketTransport())
	//handle connected
	server.On(gosocketio.OnConnection, func(c *gosocketio.Channel) {
		log.Println("New client connected id", c.Id())
	})

	server.On("join", func(c *gosocketio.Channel, roomID string) {
		totalMembers := server.Amount(roomID)
		if totalMembers == 0 {
			log.Println("client ", c.Id(), "created room")
			c.Emit("created_room", roomID)
			c.Join(roomID)
		} else if totalMembers == 1 {
			log.Println("client ", c.Id(), "join room, room is ready")
			c.Join(roomID)
			c.Emit("joined_room", roomID)
			c.BroadcastTo(roomID, "room_ready", roomID)
		}
	})

	server.On("message", func(c *gosocketio.Channel, message Message) {
		log.Println("Message ", message)
		lsChanel := server.List(message.RoomID)
		for _, cli := range lsChanel {
			if cli.Id() == c.Id() {
				continue
			}
			log.Println("Send message to id", cli.Id(), "in room", message.RoomID)
			err := cli.Emit("message", message)
			if err != nil {
				log.Println("Send message to id", cli.Id(), "err", err)
			}
		}
	})

	//setup http server
	serveMux := http.NewServeMux()
	serveMux.Handle("/wsdev/", server)
	log.Panic(http.ListenAndServe(":5000", serveMux))
}
