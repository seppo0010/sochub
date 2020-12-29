import React from 'react';
import './Twitter.css'

export const Preview = ({code}: { code: string }) => {
    const tweets = code.split(/\n\s*\*{3,}\s*\n/g).map((text) => {
        const attachments: string[] = []
        while (true) {
          const m = text.match(/!\[(.*?)\]\((.*?)\)/)
          if (!m) break;
          attachments.push(m[2])
          text = text.replace(`![${m[1]}](${m[2]})`, '')
        }
        return {text, attachments}
    })
    setTimeout(() => {
        const t = window.TrelloPowerUp.iframe();
        const imgs = document.images;
        t.sizeTo(document.body).catch(() => {});
        Array.prototype.slice.call(imgs).forEach((img) => {
            img.addEventListener('load', () => t.sizeTo(document.body).catch(() => {}), false );
        });
    })
    return <section className="timeline">
        <ul className="tweets">
            {tweets.map((t, i) => (
                <li key={i}>
                    <img src="/twitter-default-figure.png" />
                    <div className="info">
                        <strong>Nombre <span>@arroba</span></strong>
                        <p>{t.text.trim()}</p>
                        {t.attachments && (<ul className={'attachments attachments' + t.attachments.length}>
                            {t.attachments.map((a, i) => <li key={i}><img src={a} /></li>)}
                        </ul>)}
                        <div className="actions">
                            <a href="#"><img src="/comments.svg" alt="Comments" /> 3 </a>
                            <a href="#"><img src="/retweet.svg" alt="Retweet" /> 4 </a>
                            <a href="#"><img src="/like.svg" alt="Like" /> 5 </a>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </section>
}
/*
    const [preview, setPreview] = useState('')
    const t = window.TrelloPowerUp.iframe();
    */
