# The Sea Was Never Blue

Interactive data visualisation exploring the ancient Greek colour terms used in Homer's <em>Iliad</em>.

**Published project: [the_sea_was_never_blue/](https://isoparkes.github.io/the_sea_was_never_blue/)

## What I aimed to accomplish

I aimed to do a parsed text analysis of Homer's <em>Iliad</em> using the original Greek text from the Perseus Digital Library. The project looked at the colour terminology used by Homer, including what colour terms are used and the context they are used in.

## Data collection

Greek text downloaded from: <a href="https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0133" target="_blank" rel="noopener noreferrer">Perseus Digital Library</a>

I extracted every colour term with its context, book and line number, producing a dataset of 345 colour references across the <em>Iliad's</em> 24 books from 14 distinct Greek colour terms. For each colour term, a regex pattern was written to capture the full range of inflected forms that appear across the poem. 

## Build process

I used D3 to build the interactive scatterplot of the 14 colour terms, the polar area charts for each colour palette reference (Gods, Sea, Body etc) and the gleam axis below. I used React to handle the DOM and Scollama to build the scrolly-telling narrative.

## What I learned 

The analysis for this project took much longer than anticipated as there were multiple rounds of refining the regex pattern to make sure I was catching the correct roots for each colour term. I spent a long time manually confirming each parsed colour reference, which I believe is unavoidable when building a dataset from scratch. I played around with using AI to classify the colour term references into primary categories for the polar area charts, however, I eventually classified these based on keywords in Python.

## What I didn't get to / would do with more time

- I would have liked to extend the dataset by including an analysis of the Odyssey. It would be interesting to then compare the two epics. 
- It would be cool to build a visualisation which explored the book-level analysis. I found that colour density tracks narrative intensity. For example, Book 5, the Battle of the Gods, is the most colour-rich with 31 references across 8 distinct terms; Book 23, the funeral games for Patroclus, is the most colour-diverse with 11.
