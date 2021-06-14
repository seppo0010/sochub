import React, {useState} from 'react';
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import getToken from './RestApi'
import './Schedule.css'


const Schedule = () => {
    const t = window.TrelloPowerUp.iframe({
        appName: process.env.REACT_APP_TRELLO_APP_NAME,
        appKey: process.env.REACT_APP_TRELLO_APP_KEY,
    });
    const [events, setEvents] = useState<{title: string, start: string}[]>([])
    useState(async () => {
        const [lists, cards] = await Promise.all([
            t.lists('id', 'name'),
            t.cards('id', 'name', 'badges', 'due', 'cover', 'labels', 'idList'),
        ])
        if (cards) {
            const listsMap: {[id: string]: string} = {}
            if (lists) {
                lists.forEach((l) => { listsMap[l.id] = l.name })
            }
            const colors = window.TrelloPowerUp.util.colors;
            setEvents(cards.filter((c) => !!c.due).map((c) => {
                return {
                    backgroundColor: colors.getHexString(c.labels.length && c.labels[0].color ? c.labels[0].color : 'blue'),
                    title: (c.name || '') + (listsMap[c.idList] ? ` [${listsMap[c.idList]}]` : ''),
                    start: (c.due || '').substr(0, 10),
                    end: (c.due || '').substr(0, 10),
                    allDay: true,
                    extendedProps: {
                        id: c.id,
                        cover: c.cover,
                    },
                }
            }))
        }
    })
    return (
        <FullCalendar
            plugins={[ dayGridPlugin, listPlugin, interactionPlugin ]}
            initialView={t.arg('initialView')}
            events={events}
            editable={true}
            eventContent={({event}) => {
                return (
                    <div>
                        <p>{event.title}</p>
                        {event.extendedProps.cover && event.extendedProps.cover.url && <img src={event.extendedProps.cover.url} alt="" />}
                    </div>
                )
            }}
            eventClick={(ec) => {
                t.showCard(ec.event.extendedProps.id)
            }}
            eventDrop={async (ed) => {
                if (!ed || !ed.event || !ed.event.start) {
                    return;
                }
                const id = ed.event.extendedProps.id
                const date = ed.event.start.toISOString()
                window.Trello.setToken(await getToken())
                window.Trello.put(`/cards/${id}`, {due: date})
            }}
        />
    )
}
export default Schedule;
